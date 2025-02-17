import { Request, Response } from 'express';

export function Page(title: string, page: string, extraScripts: (string | { script: string, defer: boolean })[] = [], extraStyles: string[] = [], ...otherParams: any[]) {
    return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
        const original = descriptor.value;

        descriptor.value = async function (req: Request, res: Response) {
            // We run the original here so that if the decorated method has specific checks it needs to make (ex. if the ID of whatever actually exists) it can make them before rendering the page
            // 
            // !!!IMPORTANT!!!
            // This currently is kind of a hacky solution, because we bind to the target, which is the prototype rather than the instance.
            // This means instance data is not properly available/accessible within the decorated method.
            // However, you can use the `this` keyword to access other methods on the class, etc...
            //
            // The above (this approach) is necessary at time of writing because the `this` (which should be bound to for the instance) seems to be undefined within the context of the decorator function here for some reason
            // Ideally, would dive into this and do it properly but this seems to be good enough for now.
            const output = await original.bind(target)(req, res);
            
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

            res.render('base', renderParams);
        }
    }
}