import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Cropper from 'react-easy-crop';
import AuthField from '../../auth/components/AuthField';
import { teamProfilesService } from '../../services/teamProfiles/teamProfiles.service';
import { profileSubmissionLinksService } from '../../services/profileSubmissionLinks/profileSubmissionLinks.service';
import { PROFILE_DEPARTMENTS } from '../../constants/departments';
import { validatePortrait, validateProfile } from '../../admin/profiles/profileValidation';
import getCroppedImg from '../../utils/cropUtils';
import '../../auth/auth.css';
import './profile-submission.css';

const initial = { name: '', email: '', role: '', department: '', quote: '', bio: '', image: null };

export default function PublicProfileSubmissionPage() {
  const { token } = useParams();
  const [linkState, setLinkState] = useState(null);
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Cropping state
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  useEffect(() => {
    profileSubmissionLinksService.validate(token)
      .then(setLinkState)
      .finally(() => setLoading(false));
  }, [token]);

  const set = (key, value) => {
    setValues((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // Reset file input so same file can be selected again if canceled
    event.target.value = '';

    const error = validatePortrait(file);
    if (error) {
      setErrors((current) => ({ ...current, image: error }));
      return;
    }
    
    setErrors((current) => ({ ...current, image: undefined }));
    setSelectedFile(file);
    setCropModalOpen(true);
  };

  const onCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const onCropConfirm = async () => {
    try {
      const imageSrc = URL.createObjectURL(selectedFile);
      const croppedImageBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      URL.revokeObjectURL(imageSrc);
      const originalName = selectedFile.name.replace(/\.[^.]+$/, '');
      const croppedFile = new File([croppedImageBlob], `${originalName}.jpg`, { type: 'image/jpeg' });
      
      set('image', {
        file: croppedFile,
        previewUrl: URL.createObjectURL(croppedImageBlob),
        fileName: croppedFile.name,
        fileType: croppedFile.type,
        fileSize: croppedFile.size
      });
      
      setCropModalOpen(false);
      setSelectedFile(null);
    } catch {
      setErrors((current) => ({ ...current, image: 'Failed to crop image' }));
    }
  };

  const onCropCancel = () => {
    setCropModalOpen(false);
    setSelectedFile(null);
  };

  const submit = async (event) => {
    event.preventDefault();
    const nextErrors = validateProfile(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    
    setSubmitting(true);
    try {
      await teamProfilesService.submit(token, values);
      setSuccess(true);
    } catch (error) {
      setErrors({ form: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <PublicProfileShell>
        <h1>Checking your link</h1>
        <p>Please wait while we validate this profile submission link.</p>
      </PublicProfileShell>
    );
  }

  if (!linkState || linkState.state !== 'valid') {
    return (
      <PublicProfileShell>
        <h1>{linkState?.message || 'This submission link is no longer valid'}</h1>
        <p>This link may have expired, been used, or been revoked.</p>
        <Link to="/team">Return to Living the Charge</Link>
      </PublicProfileShell>
    );
  }

  if (success) {
    return (
      <PublicProfileShell>
        <h1>Profile submitted</h1>
        <p>Thanks, {values.name}.</p>
        <p>Your profile has been sent to the Living the Charge team for review. Nothing will appear publicly until the submission has been approved.</p>
        <p>You can now close this page.</p>
      </PublicProfileShell>
    );
  }

  return (
    <PublicProfileShell>
      <div className="profile-public-eyebrow">Profile submission · About 3 minutes</div>
      <h1>Create your team profile</h1>
      <p>Tell us a little about yourself. Your submission will be reviewed by the Living the Charge team before appearing on the website.</p>
      
      {errors.form && <p className="profile-public-error" role="alert">{errors.form}</p>}
      
      <form className="profile-public-form" onSubmit={submit} noValidate>
        <fieldset>
          <legend>Basic information</legend>
          <AuthField label="Full name" name="profile-name" value={values.name} onChange={(event) => set('name', event.target.value)} error={errors.name} required />
          <AuthField label="Email address" name="profile-email" type="email" value={values.email} onChange={(event) => set('email', event.target.value)} error={errors.email} required />
        </fieldset>
        
        <fieldset>
          <legend>Role information</legend>
          <AuthField label="Role / Position" name="profile-role" value={values.role} onChange={(event) => set('role', event.target.value)} error={errors.role} required />
          <div className="profile-public-field">
            <label htmlFor="profile-department">Department</label>
            <select id="profile-department" value={values.department} onChange={(event) => set('department', event.target.value)}>
              <option value="">Select department</option>
              {PROFILE_DEPARTMENTS.map((department) => <option key={department}>{department}</option>)}
            </select>
            {errors.department && <small>{errors.department}</small>}
          </div>
        </fieldset>
        
        <fieldset>
          <legend>About you</legend>
          <div className="profile-public-field">
            <label htmlFor="profile-quote">Quote <span>{values.quote.length}/180</span></label>
            <input id="profile-quote" value={values.quote} maxLength={180} onChange={(event) => set('quote', event.target.value)} />
            {errors.quote && <small>{errors.quote}</small>}
          </div>
          <div className="profile-public-field">
            <label htmlFor="profile-bio">Biography <span>{values.bio.length}/1000</span></label>
            <textarea id="profile-bio" value={values.bio} maxLength={1000} onChange={(event) => set('bio', event.target.value)} />
            {errors.bio && <small>{errors.bio}</small>}
          </div>
        </fieldset>
        
        <fieldset>
          <legend>Portrait</legend>
          <p className="profile-upload-help">Use a clear professional portrait. JPEG, PNG or WebP. Maximum 5 MB.</p>
          <div className="profile-upload">
            <label className="profile-upload-dropzone" htmlFor="profile-image">
              <strong>Upload portrait</strong>
              <span>JPEG, PNG or WebP · Max 5 MB</span>
              <em>Choose photo</em>
            </label>
            <input className="profile-upload-input" id="profile-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} />
            {values.image?.previewUrl && (
              <div className="profile-upload-preview">
                <img src={values.image.previewUrl} alt="Portrait preview" />
                <span>{values.image.fileName}</span>
                <button type="button" onClick={() => set('image', null)}>Remove</button>
              </div>
            )}
          </div>
          {errors.image && <small className="profile-public-error">{errors.image}</small>}
        </fieldset>
        
        <div className="profile-public-preview">
          <strong>Review your profile</strong>
          {values.image?.previewUrl && <img src={values.image.previewUrl} alt="Profile preview" />}
          <h2>{values.name || 'Your name'}</h2>
          <p>{values.role || 'Your role'} · {values.department || 'Department'}</p>
          <blockquote>{values.quote || 'Your quote will appear here.'}</blockquote>
          <p>{values.bio || 'Your biography will appear here.'}</p>
        </div>
        
        <p className="profile-submit-reminder">Your profile will be reviewed before it appears publicly.</p>
        <button className="profile-public-submit" type="submit" disabled={submitting}>
          {submitting ? 'Submitting…' : 'Submit profile for review'}
        </button>
      </form>

      {cropModalOpen && (
        <div className="profile-crop-modal" onClick={onCropCancel}>
          <div className="profile-crop-container" onClick={(e) => e.stopPropagation()}>
            <div className="profile-crop-area">
              <Cropper
                image={selectedFile ? URL.createObjectURL(selectedFile) : ''}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="profile-crop-controls">
              <button type="button" className="profile-crop-cancel" onClick={onCropCancel}>Cancel</button>
              <button type="button" className="profile-crop-apply" onClick={onCropConfirm}>Apply</button>
            </div>
          </div>
        </div>
      )}
    </PublicProfileShell>
  );
}

function PublicProfileShell({ children }) {
  return (
    <main className="profile-public-page">
      <div className="profile-public-brand">
        <img src="/brand/ltc-logo-white.svg" alt="Living the Charge" width="512" height="512" />
        <span>Living the Charge</span>
      </div>
      <div className="profile-public-card">{children}</div>
    </main>
  );
}
