import { NextFunction } from 'express';
import { NextHandleFunction } from 'connect';

export const PUT_METADATA_KEY = 'Put';

/**
 * Method decorator intended to be used on methods of a class decorated with the `@Controller` decorator.
 * 
 * This in conjunction with the `@Controller` decorator will automatically setup a PUT route that executes the decorated method.
 * The specific path for the route is defined by the path parameter.
 * Controller authors can also specify middleware to be used with the PUT route (because a middleware is commonly required to parse the body of a PUT request).
 * 
 * @param path The path for the PUT route.
 * @param middleware The middleware to use with the PUT route.
 */
export function PUT(path: string, ...middleware: (NextHandleFunction | NextFunction)[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Define a metadata key with the path and middleware as the value on the target's propertyKey
        Reflect.defineMetadata(PUT_METADATA_KEY, { path, middleware }, target, propertyKey);
    };
}