import { Request, Response } from 'express';

// Response type guard
function isResponse(obj) {
    return obj && typeof obj.render === 'function';
}

/**
 * The `Page` decorator allows for easy rendering of a page.
 *
 * Note, that the parameters for the function the page decorator is placed on is not restrictive.
 * This is because JavaScript doesn't have the idea of named arguments so a request handler like:
 *
 * ```ts
 * function handle(req: Request, res: Response)
 * ```
 *
 * Is different from a middleware handler like:
 *
 * ```ts
 * function handle(req: Request, res: Response, next: NextFunction)
 * ```
 *
 * Is different from an error handler like:
 *
 * ```ts
 * function handle(err: Error, req: Request, res: Response, next: NextFunction)
 * ```
 *
 * Despite them all being, more or less, equivalent for the page decorator's usage.
 *
 * @param title The title of the page
 * @param page The name of the page file to render
 * @param extraScripts Any extra scripts to include in the page
 * @param extraStyles Any extra styles to include in the page
 * @param otherParams Any other parameters to pass to the page
 */
export function Page(title: string, page: string, extraScripts: (string | { script: string, defer: boolean })[] = [], extraStyles: string[] = [], ...otherParams: any[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            if (!args.some(arg => isResponse(arg)) || args.filter(arg => isResponse(arg)).length > 1) {
                console.warn(`Page decorator: Incorrect number of response objects found in arguments for ${propertyKey}. Should ONLY be one response object.`);
                return;
            }
            
            // We run the original here so that if the decorated method has specific checks it needs to make (ex. if the ID of whatever actually exists) it can make them before rendering the page
            // 
            // !!!IMPORTANT!!!
            // This currently is kind of a hacky solution, because we bind to the target, which is the prototype rather than the instance.
            // This means instance data is not properly available/accessible within the decorated method.
            // However, you can use the `this` keyword to access other methods on the class, etc...
            //
            // The above (this approach) is necessary at time of writing because the `this` (which should be bound to for the instance) seems to be undefined within the context of the decorator function here for some reason
            // Ideally, would dive into this and do it properly but this seems to be good enough for now.
            const output = await original.bind(target)(...args);
            
            // If the output is false, we don't want to render the page
            // 
            // This allows the decorated method to handle the response itself
            // Ex. Logging in, if the user is already logged in we want to redirect them, not render the login page again
            if(typeof output === 'boolean' && !output) {
                return;
            }

            const renderParams: { [key: string]: any } = {
                title: title,
                page: page,
                extraStyles: extraStyles,
                extraScripts: extraScripts,
                ...otherParams
            };

            // If the decorated method's output is an object, we want to merge it with the renderParams
            if(typeof output === 'object') {
                Object.entries(output).forEach((entry) => {
                    renderParams[entry[0]] = entry[1];
                });
            }

            args.find(arg => isResponse(arg)).render('base', renderParams);
        }
    }
}