import { createSessionLogoutHandler } from '@mairie360/front-kit/next';
import { serverSessionConfig } from '../../../../lib/server-session';

export const POST = createSessionLogoutHandler(serverSessionConfig);
