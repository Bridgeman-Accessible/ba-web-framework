import { NextFunction } from 'express';
import { NextHandleFunction } from 'connect';

/**
 * Method decorator intended to be used on methods of a class decorated with the `@Controller` decorator.
 * 
 * This in conjunction with the `@Controller` decorator will automatically setup a POST route that executes the decorated method.
 * The specific path for the route is defined by the path parameter.
 * Controller authors can also specify middleware to be used with the POST route (because a middleware is commonly required to parse the body of a POST request).
 * 
 * @param path The path for the GET route.
 * @param middleware The middleware to use with the POST route.
 */
export function POST(path: string, ...middleware: (NextHandleFunction | NextFunction)[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Define a `Get` metadata key with the path as the value on the target's propertyKey
        Reflect.defineMetadata('Post', { path, middleware }, target, propertyKey);
    };
}