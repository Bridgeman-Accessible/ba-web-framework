import { NextFunction } from 'express';
import { NextHandleFunction } from 'connect';

export const DELETE_METADATA_KEY = 'Delete';

/**
 * Method decorator intended to be used on methods of a class decorated with the `@Controller` decorator.
 * 
 * This in conjunction with the `@Controller` decorator will automatically setup a DELETE route that executes the decorated method.
 * The specific path for the route is defined by the path parameter.
 * Controller authors can also specify middleware to be used with the DELETE route (because a middleware is commonly required to parse the body of a DELETE request).
 * 
 * @param path The path for the DELETE route.
 * @param middleware The middleware to use with the DELETE route.
 */
export function DELETE(path: string, ...middleware: (NextHandleFunction | NextFunction)[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Define a metadata key with the path and middleware as the value on the target's propertyKey
        Reflect.defineMetadata(DELETE_METADATA_KEY, { path, middleware }, target, propertyKey);
    };
}