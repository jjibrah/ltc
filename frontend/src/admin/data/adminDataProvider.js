import { mentorsService, profilesService, usersService as legacyUsersService } from '../api/adminServices';
import { newsletterService } from '../../services/newsletter/newsletter.service';
import { storiesService } from '../../services/stories/stories.service';

// Mock data is intentionally unavailable in production builds.
export const adminDataMode = 'api';
const apiProvider = {
  listUsers: legacyUsersService.list,
  createInvitation: legacyUsersService.invite,
  listProfiles: profilesService.list,
  createProfileInvitation: profilesService.invite,
  listNewsletters: newsletterService.list,
  createNewsletter: (data) => newsletterService.create(data),
  updateNewsletter: newsletterService.update,
  sendNewsletter: newsletterService.send,
  listMentors: mentorsService.list,
  updateMentorStatus: mentorsService.updateStatus,
  listStories: storiesService.list,
  createStory: storiesService.create,
  updateStory: storiesService.update,
  deleteStory: storiesService.remove,
};

export const adminDataProvider = apiProvider;
