import { createSessionLogoutHandler } from '@mairie360/lib-components/next';
import { serverSessionConfig } from '../../../../lib/server-session';

export const POST = createSessionLogoutHandler(serverSessionConfig);
