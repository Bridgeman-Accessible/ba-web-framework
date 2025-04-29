import { Request, Response, NextFunction, RequestHandler } from 'express';

export enum HealthCheckStatus {
    OK = 'ok',
    ERROR = 'error'
}

export class HealthCheckMiddleware {
    public static readonly HEALTH_CHECK_ENDPOINT = '/.well-known/health-check';

    private static status: HealthCheckStatus;
    
    constructor(initialStatus: HealthCheckStatus = HealthCheckStatus.OK) {
        HealthCheckMiddleware.status = initialStatus;
    }

    static setStatus(status: HealthCheckStatus) {
        HealthCheckMiddleware.status = status;
    }

    middleware(req: Request, res: Response, next: NextFunction) {
        if(req.path === HealthCheckMiddleware.HEALTH_CHECK_ENDPOINT) {
            switch(HealthCheckMiddleware.status) {
                case HealthCheckStatus.OK:
                    return res.status(200).setHeader('Content-Type', 'application/health+json').json({ status: 'ok' });
                    break;
                case HealthCheckStatus.ERROR:
                    return res.status(500).setHeader('Content-Type', 'application/health+json').json({ status: 'error' });
                    break;
            }
        }

        next();
    }
}

/**
 * Middleware function to create a health check endpoint.
 * 
 * This attempts to comply with the [Health Check Response Format for HTTP APIs](https://datatracker.ietf.org/doc/html/draft-inadarei-api-health-check-06) proposed standard.
 * 
 * @param initialStatus The initial status of the health check.
 * @returns The middleware function.
 */
export function healthCheckMiddleware(initialStatus: HealthCheckStatus = HealthCheckStatus.OK) {
    const instance = new HealthCheckMiddleware(initialStatus);

    return instance.middleware.bind(instance);
}