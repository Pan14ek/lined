import common from './common.json';
import auth from './auth.json';
import dashboard from './dashboard.json';
import calendar from './calendar.json';
import tasks from './tasks.json';
import lobby from './lobby.json';
import settings from './settings.json';
import subscription from './subscription.json';
import notifications from './notifications.json';

const uk = {
  common,
  auth,
  dashboard,
  calendar,
  tasks,
  lobby,
  settings,
  subscription,
  notifications,
} as const;

export default uk;
