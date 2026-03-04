// public env only
import { env } from '$env/dynamic/public';

export class AppConfig {
	// app name => mari.software
	getAppName(): string {
		// Use PUBLIC_APP_NAME from env if available, otherwise default to 'mari.software'
		return env.PUBLIC_APP_NAME || 'heka';
	}
}
