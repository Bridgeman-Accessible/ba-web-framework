import { Request, Response, NextFunction } from 'express';

import { ErrorController } from '../controllers/ErrorController';

/**
 * Class decorator to create custom error handling for the app.
 * 
 * That is, so that custom error pages can easily be created and used in the app.
 * 
 * @example
 * The following example show how to use the Controller decorator to setup a path `/path` with a GET, POST, PUT and DELETE method.
 * ```ts
 * import { Request, Response, NextFunction } from 'express';
 * 
 * import { ErrorController, ErrorHandler } from '@BridgemanAccessible/ba-web-framework';
 * 
 * @ErrorHandler(404)
 * export class Custom404PageController extends ErrorController {
 *     handle(error: unknown, req: Request, res: Response, next: NextFunction) {
 *        // ...
 *     }
 * }
 * ```
 * 
 * @param errorCode The error code to handle. This is the status code that will be returned by the server.
 * @param description A human readable string to describe the error this controller handles. This is used for debugging purposes only and is not used in the app itself.
 */
export function ErrorHandler<T extends { new(...args: any): ErrorController }>(errorCode: number, description?: string) {
    // Technically the function we return here with the target parameter is the actual decorator itself but we wrap it in case we ever want to add parameters to the decorator
    return function(target: T){
        Reflect.defineMetadata('errorHandler', target, target);

        if(typeof target.prototype.handlesError === 'undefined') {
            // If the handlesError property is not set, we set it to the description passed to the decorator
            target.prototype.handlesError = description || `${errorCode}`;
        }

        // We extend the class that is decorated and override the setup method to automatically setup the routes
        return class extends target {
            async handle(error: unknown, req: Request, res: Response, next: NextFunction) {
                // Because the headers have already been sent, we cannot send a response again. 
                // So we check if the headers have been sent and if so, we call the next middleware (default) in the error chain.
                if(res.headersSent) {
                    return next(error);
                }

                // Create an instance of the decorated (original) class
                const controller: ErrorController = new (Reflect.getMetadata('errorHandler', target))();

                // We only want to call the handle method if the error code matches the one denoted.
                if(res.statusCode === errorCode) {
                    // Call the handle method of the controller and return the result
                    return await controller.handle.bind(controller)(error, req, res, next);
                }
                else {
                    // If the error code does not match, we call the next middleware in the error chain
                    return next(error);
                }
            }
        }
    }
}