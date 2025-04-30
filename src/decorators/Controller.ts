import { Application, NextFunction } from 'express';

import { BaseController } from '../controllers/BaseController';

import { CHILD_CONTROLLER_METADATA_KEY } from './ChildController';
import { GET_METADATA_KEY } from './GET';
import { POST_METADATA_KEY } from './POST';
import { PUT_METADATA_KEY } from './PUT';
import { DELETE_METADATA_KEY } from './DELETE';

/**
 * Class decorator to "fill in" the setup method which is called on server startup and connects the methods/functions and their desired paths in the express app.
 *
 * That is, this is largely for the convenience of controller writers/developers so that they don't have to manually create a `setup` method in their controller classes.
 *
 * @example
 * The following example show how to use the Controller decorator to setup a path `/path` with a GET, POST, PUT and DELETE method.
 * ```ts
 * import { Request, Response } from 'express';
 *
 * import { Controller, GET, POST, BaseController } from '@BridgemanAccessible/ba-web-framework';
 *
 * @Controller()
 * export class MyController extends BaseController {
 *     @GET('/path')
 *     private myGetMethod(req: Request, res: Response) {}
 *
 *     @POST('/path', express.json())
 *     private myPostMethod(req: Request, res: Response) {}
 *
 *    @PUT('/path', express.json())
 *    private myPutMethod(req: Request, res: Response) {}
 *
 *    @DELETE('/path', express.json())
 *    private myDeleteMethod(req: Request, res: Response) {}
 * }
 * ```
 */
export function Controller<T extends { new (...args: any[]): BaseController }>() {
    // Technically the function we return here with the target parameter is the actual decorator itself but we wrap it in case we ever want to add parameters to the decorator
    return function(target: T){
        Reflect.defineMetadata('originalClass', target, target);
        // We extend the class that is decorated and override the setup method to automatically setup the routes
        return class extends target {
            /**
             * Setup the routes for the controller.
             * 
             * @param app The express application to setup the routes on.
             */
            static setup(app: Application) {
                // If the decorated class is also decorated with the `@ChildController` decorator, 
                // then we call the child controller's setup method as well.
                // 
                // Currently, there is very little linkage between the decorated controller class and the child controller class(es).
                // Though in the future this may look more like forcing these to be on sub-paths of the parent controller etc...
                const childControllers = Reflect.getMetadata(CHILD_CONTROLLER_METADATA_KEY, target);
                if(typeof childControllers !== 'undefined') {
                    if(Array.isArray(childControllers)) {
                        childControllers.forEach((childController) => {
                            childController.setup(app);
                        });
                    } else {
                        childControllers.setup(app);
                    }
                }

                const controller = new (Reflect.getMetadata('originalClass', target))();

                // Loop over all the methods in the decorated class looking for methods that use the GET decorator
                Object.getOwnPropertyNames(target.prototype)
                    // Find all methods that have a Get metadata key (GET decorator)
                    .filter((method) => Reflect.getMetadata(GET_METADATA_KEY, target.prototype, method))
                    .map((method) => {
                        // Get the method
                        const fn = target.prototype[method];

                        // Get the path
                        const path = Reflect.getMetadata(GET_METADATA_KEY, target.prototype, method);

                        // Bind the method to the class instance
                        app.get(path, fn.bind(controller));
                    });
                
                // Loop over all the methods in the decorated class looking for methods that use the POST decorator
                Object.getOwnPropertyNames(target.prototype)
                    // Find all methods that have a Post metadata key (POST decorator)
                    .filter((method) => Reflect.getMetadata(POST_METADATA_KEY, target.prototype, method))
                    .map((method) => {
                        // Get the method
                        const fn = target.prototype[method];

                        // Get the metadata object (which contains a path and middleware)
                        const postRoute = Reflect.getMetadata(POST_METADATA_KEY, target.prototype, method);
                        const path = postRoute.path;
                        const middleware: NextFunction[] = postRoute.middleware;

                        // Bind the method to the class instance
                        app.post(path, ...middleware, fn.bind(controller));
                    });

                // Loop over all the methods in the decorated class looking for methods that use the `@PUT` decorator
                Object.getOwnPropertyNames(target.prototype)
                    // Find all methods that have the associated metadata key (`@PUT` decorator)
                    .filter((method) => Reflect.getMetadata(PUT_METADATA_KEY, target.prototype, method))
                    .map((method) => {
                        // Get the method
                        const fn = target.prototype[method];
                        
                        // Get the metadata object (which contains a path and middleware)
                        const putRoute = Reflect.getMetadata(PUT_METADATA_KEY, target.prototype, method);
                        const path = putRoute.path;
                        const middleware = putRoute.middleware;
                        
                        // Bind the method to the class instance
                        app.put(path, ...middleware, fn.bind(controller));
                    });
                
                // Loop over all the methods in the decorated class looking for methods that use the `@DELETE` decorator
                Object.getOwnPropertyNames(target.prototype)
                    // Find all methods that have the associated metadata key (`@DELETE` decorator)
                    .filter((method) => Reflect.getMetadata(DELETE_METADATA_KEY, target.prototype, method))
                    .map((method) => {
                        // Get the method
                        const fn = target.prototype[method];
                    
                        // Get the metadata object (which contains a path and middleware)
                        const deleteRoute = Reflect.getMetadata(DELETE_METADATA_KEY, target.prototype, method);
                        const path = deleteRoute.path;
                        const middleware = deleteRoute.middleware;
                        
                        // Bind the method to the class instance
                        app.delete(path, ...middleware, fn.bind(controller));
                    });
            }
        }
    }
}