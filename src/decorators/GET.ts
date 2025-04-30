export const GET_METADATA_KEY = 'Get';

/**
 * Method decorator intended to be used on methods of a class decorated with the `@Controller` decorator.
 * 
 * This in conjunction with the `@Controller` decorator will automatically setup a GET route that executes the decorated method.
 * The specific path for the route is defined by the path parameter.
 * 
 * @param path The path for the GET route.
 */
export function GET(path: string) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        // Define a `Get` metadata key with the path as the value on the target's propertyKey
        Reflect.defineMetadata(GET_METADATA_KEY, path, target, propertyKey);
    };
}