import { App, Stack, Duration, RemovalPolicy, CfnParameter, CfnOutput, aws_sns as sns, aws_sns_subscriptions as subscriptions, aws_cloudwatch_actions as actions, aws_budgets as budgets, aws_cloudwatch as cw, aws_s3 as s3, aws_cloudfront as cf, aws_cloudfront_origins as origins, aws_ec2 as ec2, aws_ecs as ecs, aws_ecs_patterns as patterns, aws_ecr as ecr, aws_sqs as sqs, aws_iam as iam, aws_secretsmanager as secrets, aws_logs as logs, aws_elasticache as cache, aws_scheduler as scheduler, aws_certificatemanager as acm, aws_elasticloadbalancingv2 as elbv2 } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
class Foundation extends Stack {
    readonly repository: ecr.Repository;
    constructor(scope: Construct, id: string) { super(scope, id); this.repository = new ecr.Repository(this, 'Images', { imageScanOnPush: true, imageTagMutability: ecr.TagMutability.IMMUTABLE, removalPolicy: RemovalPolicy.RETAIN }); new CfnOutput(this, 'RepositoryUri', { value: this.repository.repositoryUri }); }
}
class LtcStack extends Stack {
    constructor(scope: Construct, id: string, repository: ecr.Repository) {
        super(scope, id);
        const release = new CfnParameter(this, 'ImageTag', { type: 'String', description: 'Owner-published immutable ECR image tag; never latest' });
        const applicationEnvironment = new CfnParameter(this, 'ApplicationEnvironment', { type: 'String', default: 'staging', allowedValues: ['staging','production'], description: 'Separate environment-specific stacks, secrets and provider configuration are required' });
        const secretArn = new CfnParameter(this, 'RuntimeSecretArn', { type: 'String', noEcho: true, description: 'Existing Secrets Manager JSON secret for this environment' });
        const certificateArn = new CfnParameter(this, 'ApiCertificateArn', { type: 'String', description: 'Regional ACM certificate ARN' });
        const budgetEmail = new CfnParameter(this, 'AlertEmail', { type: 'String', description: 'Owner-approved monitoring recipient; configure before deployment' });
        const monthlyBudget = new CfnParameter(this, 'MonthlyBudgetUsd', { type: 'Number', minValue: 1, description: 'Owner-approved monthly AWS budget (USD)' });
        const topic = new sns.Topic(this, 'Alerts');
        topic.addSubscription(new subscriptions.EmailSubscription(budgetEmail.valueAsString));
        new budgets.CfnBudget(this, 'CostBudget', { budget: { budgetName: `${id}-monthly`, budgetType: 'COST', timeUnit: 'MONTHLY', budgetLimit: { amount: monthlyBudget.valueAsNumber, unit: 'USD' } }, notificationsWithSubscribers: [{ notification: { comparisonOperator: 'GREATER_THAN', notificationType: 'ACTUAL', threshold: 80, thresholdType: 'PERCENTAGE' }, subscribers: [{ subscriptionType: 'EMAIL', address: budgetEmail.valueAsString }] }] });
        const website = new s3.Bucket(this, 'Website', { blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL, enforceSSL: true, versioned: true, removalPolicy: RemovalPolicy.RETAIN });
        const siteDomain = this.node.tryGetContext('siteDomain') as string | undefined;
        const siteCertificateArn = this.node.tryGetContext('siteCertificateArn') as string | undefined;
        if (Boolean(siteDomain) !== Boolean(siteCertificateArn)) throw new Error('Provide both siteDomain and siteCertificateArn for the public hostname');
        if (siteDomain && !/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(siteDomain)) throw new Error('Invalid public hostname');
        if (siteCertificateArn && !/^arn:aws:acm:us-east-1:\d{12}:certificate\/[a-zA-Z0-9-]+$/.test(siteCertificateArn)) throw new Error('CloudFront certificate must be in us-east-1');
        const rewrite = new cf.Function(this, 'SpaRoutes', { code: cf.FunctionCode.fromInline(`function handler(event) { var r=event.request; var p=r.uri; var asset=/^\\/(assets|images)(\\/|$)/.test(p); var route=/^\\/(about|mission|impact|stories|team|donate|donation-success|mentor|login|forgot-password|set-password|reset-password|admin|profile\\/submit|unsubscribe)(\\/|$)/.test(p); if(!asset&&!/^\\/(api)(\\/|$)/.test(p)&&(route||p.indexOf('.')===-1)) r.uri='/index.html'; return r; }`) });
        const distribution = new cf.Distribution(this, 'StaticDistribution', { ...(siteDomain && siteCertificateArn ? { domainNames: [siteDomain], certificate: acm.Certificate.fromCertificateArn(this, 'SiteCertificate', siteCertificateArn) } : {}), defaultBehavior: { origin: origins.S3BucketOrigin.withOriginAccessControl(website), viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, compress: true, cachePolicy: cf.CachePolicy.CACHING_DISABLED, functionAssociations: [{ function: rewrite, eventType: cf.FunctionEventType.VIEWER_REQUEST }] }, additionalBehaviors: { 'assets/*': { origin: origins.S3BucketOrigin.withOriginAccessControl(website), viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, compress: true, cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED }, 'images/*': { origin: origins.S3BucketOrigin.withOriginAccessControl(website), viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, cachePolicy: cf.CachePolicy.CACHING_OPTIMIZED }, 'index.html': { origin: origins.S3BucketOrigin.withOriginAccessControl(website), viewerProtocolPolicy: cf.ViewerProtocolPolicy.REDIRECT_TO_HTTPS, cachePolicy: cf.CachePolicy.CACHING_DISABLED } } });
        const vpc = new ec2.Vpc(this, 'Vpc', { maxAzs: 2, natGateways: 2 });
        const cluster = new ecs.Cluster(this, 'Cluster', { vpc, containerInsightsV2: ecs.ContainerInsights.ENABLED });
        const runtime = secrets.Secret.fromSecretCompleteArn(this, 'RuntimeSecret', secretArn.valueAsString);
        const dlq = new sqs.Queue(this, 'DeadLetters', { encryption: sqs.QueueEncryption.SQS_MANAGED, retentionPeriod: Duration.days(14) });
        const queue = new sqs.Queue(this, 'Jobs', { encryption: sqs.QueueEncryption.SQS_MANAGED, visibilityTimeout: Duration.minutes(5), retentionPeriod: Duration.days(14), deadLetterQueue: { queue: dlq, maxReceiveCount: 5 } });
        const apiSg = new ec2.SecurityGroup(this, 'ApiSecurityGroup', { vpc });
        const workerSg = new ec2.SecurityGroup(this, 'WorkerSecurityGroup', { vpc });
        const redisSg = new ec2.SecurityGroup(this, 'RedisSecurityGroup', { vpc });
        redisSg.addIngressRule(apiSg, ec2.Port.tcp(6379));
        redisSg.addIngressRule(workerSg, ec2.Port.tcp(6379));
        const subnetGroup = new cache.CfnSubnetGroup(this, 'RedisSubnets', { description: 'Private Redis subnets', subnetIds: vpc.privateSubnets.map(s => s.subnetId) });
        const redisParams = new cache.CfnParameterGroup(this, 'RedisParameters', { cacheParameterGroupFamily: 'redis7', description: 'Protect rate counters', properties: { 'maxmemory-policy': 'noeviction' } });
        const redis = new cache.CfnReplicationGroup(this, 'Redis', { replicationGroupDescription: 'Distributed rate limits', engine: 'redis', cacheNodeType: 'cache.t4g.small', numCacheClusters: 2, automaticFailoverEnabled: true, multiAzEnabled: true, atRestEncryptionEnabled: true, transitEncryptionEnabled: true, cacheSubnetGroupName: subnetGroup.ref, cacheParameterGroupName: redisParams.ref, securityGroupIds: [redisSg.securityGroupId], snapshotRetentionLimit: 7 });
        const env = { APP_ENV: applicationEnvironment.valueAsString, PORT: '8000', TRUST_PROXY_HOPS: '1', SQS_QUEUE_URL: queue.queueUrl, REDIS_URL: `rediss://${redis.attrPrimaryEndPointAddress}:6379` };
        const keys = ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'FRONTEND_URL', 'AUTH_REDIRECT_URL', 'CORS_ORIGINS', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'RESEND_API_KEY', 'ORG_MAILING_ADDRESS', 'RESEND_FROM_ADDRESS', 'STRIPE_API_VERSION', 'PRIMARY_SUPER_ADMIN_ID'];
        const injected = Object.fromEntries(keys.map(k => [k, ecs.Secret.fromSecretsManager(runtime, k)]));
        const ga4Reporting = ['true', true].includes(this.node.tryGetContext('ga4Reporting'));
        const ga4Secrets = ga4Reporting ? Object.fromEntries(['GA4_PROPERTY_ID', 'GA4_CLIENT_EMAIL', 'GA4_PRIVATE_KEY', 'GA4_HOSTNAMES'].map(k => [k, ecs.Secret.fromSecretsManager(runtime, k)])) : {};
        const apiSecrets = { ...injected, ...ga4Secrets };
        const api = new patterns.ApplicationLoadBalancedFargateService(this, 'Api', { cluster, desiredCount: 2, cpu: 512, memoryLimitMiB: 1024, assignPublicIp: false, taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, securityGroups: [apiSg], protocol: elbv2.ApplicationProtocol.HTTPS, listenerPort: 443, certificate: acm.Certificate.fromCertificateArn(this, 'ApiCertificate', certificateArn.valueAsString), taskImageOptions: { image: ecs.ContainerImage.fromEcrRepository(repository, release.valueAsString), containerPort: 8000, environment: { ...env, GA4_ENABLED: ga4Reporting ? 'true' : 'false' }, secrets: apiSecrets, logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'api', logRetention: logs.RetentionDays.ONE_MONTH }) }, circuitBreaker: { rollback: true }, minHealthyPercent: 100, maxHealthyPercent: 200 });
        api.targetGroup.configureHealthCheck({ path: '/api/ready', healthyHttpCodes: '200', interval: Duration.seconds(30), timeout: Duration.seconds(10) });
        const scale = api.service.autoScaleTaskCount({ minCapacity: 2, maxCapacity: 6 });
        scale.scaleOnCpuUtilization('CpuScale', { targetUtilizationPercent: 60 });
        const task = new ecs.FargateTaskDefinition(this, 'WorkerTask', { cpu: 512, memoryLimitMiB: 1024 });
        task.addContainer('Worker', { image: ecs.ContainerImage.fromEcrRepository(repository, release.valueAsString), command: ['node', 'dist/src/workers/worker.js'], environment: env, secrets: injected, logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'worker', logRetention: logs.RetentionDays.ONE_MONTH }) });
        new ecs.FargateService(this, 'Worker', { cluster, taskDefinition: task, desiredCount: 1, minHealthyPercent: 100, maxHealthyPercent: 200, assignPublicIp: false, vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS }, securityGroups: [workerSg], circuitBreaker: { rollback: true } });
        queue.grantSendMessages(api.taskDefinition.taskRole);
        queue.grantConsumeMessages(task.taskRole);
        queue.grantSendMessages(task.taskRole);
        const scheduledRole = new iam.Role(this, 'SchedulerRole', { assumedBy: new iam.ServicePrincipal('scheduler.amazonaws.com') });
        queue.grantSendMessages(scheduledRole);
        new scheduler.CfnSchedule(this, 'InvitationCleanup', { flexibleTimeWindow: { mode: 'OFF' }, scheduleExpression: 'rate(1 day)', target: { arn: queue.queueArn, roleArn: scheduledRole.roleArn, input: JSON.stringify({ kind: 'invitation-cleanup' }), deadLetterConfig: { arn: dlq.queueArn }, retryPolicy: { maximumRetryAttempts: 3, maximumEventAgeInSeconds: 3600 } } });
        dlq.grantSendMessages(scheduledRole);
        queue.metricApproximateAgeOfOldestMessage().createAlarm(this, 'QueueAge', { threshold: 600, evaluationPeriods: 2 });
        dlq.metricApproximateNumberOfMessagesVisible().createAlarm(this, 'DeadLettersAlarm', { threshold: 1, evaluationPeriods: 1 });
        api.service.metricMemoryUtilization().createAlarm(this, 'MemoryAlarm', { threshold: 80, evaluationPeriods: 3 });
        api.service.metricCpuUtilization().createAlarm(this, 'CpuAlarm', { threshold: 85, evaluationPeriods: 3 });
        api.targetGroup.metrics.httpCodeTarget(elbv2.HttpCodeTarget.TARGET_5XX_COUNT, { statistic: 'Sum', period: Duration.minutes(5) }).createAlarm(this, 'ApiErrors', { threshold: 10, evaluationPeriods: 2 });
        api.targetGroup.metrics.targetResponseTime({ statistic: 'p95' }).createAlarm(this, 'LatencyAlarm', { threshold: 1, evaluationPeriods: 3 });
        new cw.Metric({ namespace: 'ECS/ContainerInsights', metricName: 'RunningTaskCount', dimensionsMap: { ClusterName: cluster.clusterName, ServiceName: api.service.serviceName }, statistic: 'Minimum', period: Duration.minutes(1) }).createAlarm(this, 'ApiTaskCount', { threshold: 2, evaluationPeriods: 3, comparisonOperator: cw.ComparisonOperator.LESS_THAN_THRESHOLD });
        new CfnOutput(this, 'WebsiteBucket', { value: website.bucketName });
        new CfnOutput(this, 'CloudFrontDomain', { value: distribution.distributionDomainName });
        new CfnOutput(this, 'ApiDns', { value: api.loadBalancer.loadBalancerDnsName });
        new CfnOutput(this, 'RepositoryUri', { value: repository.repositoryUri });
        new CfnOutput(this, 'QueueUrl', { value: queue.queueUrl });
        new CfnOutput(this, 'AlertConfigurationRequired', { value: budgetEmail.valueAsString });
    }
}
const app = new App({ context: { '@aws-cdk/core:defaultCrossStackReferences': 'strong' } });
const deployment=String(app.node.tryGetContext('deployment')||'Ltc');
if(!/^[A-Za-z][A-Za-z0-9-]{0,40}$/.test(deployment))throw new Error('Invalid deployment prefix');
const foundation = new Foundation(app, `${deployment}Foundation`);
const stack = new LtcStack(app, `${deployment}Migration`, foundation.repository);
stack.node.findAll().forEach(node => { if (node instanceof cw.Alarm)
    node.addAlarmAction(new actions.SnsAction(stack.node.findChild('Alerts') as sns.Topic)); });
