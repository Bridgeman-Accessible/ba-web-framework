import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Class that creates middleware to set global template values for all pages.
 */
class GlobalTemplateValuesMiddleware {    
    /** The description of the website. */
    private description?: string;
    
    /** The keywords for the website. */
    private keywords?: string;
    
    /** The author of the website. */
    private author?: string;
    
    /** The prefix for the title of the website. */
    private titlePrefix?: string;

    /** The suffix for the title of the website. */
    private titleSuffix?: string;

    /** Other values to set. */
    private otherValues: { [key: string]: string } = {};

    /**
     * Constructor for the GlobalTemplateValuesMiddleware class.
     * 
     * @param options Options for the middleware.
     * @param options.description The description of the website.
     * @param options.keywords The keywords for the website.
     * @param options.author The author of the website.
     * @param options.titlePrefix The prefix for the title of the website.
     * @param options.titleSuffix The suffix for the title of the website.
     * @param options[key] Any other values to set.
     */
    constructor(options: { description?: string, keywords?: string, author?: string, titlePrefix?: string, titleSuffix?: string, [key: string]: string | undefined }) {
        this.description = options.description;
        this.keywords = options.keywords;
        this.author = options.author;
        this.titlePrefix = options.titlePrefix;
        this.titleSuffix = options.titleSuffix;
        Object.keys(options).forEach(key => {
            if(!['company', 'description', 'keywords', 'author', 'titlePrefix', 'titleSuffix'].includes(key)) {
                this.otherValues[key] = options[key] as string;
            }
        })
    }

    /**
     * Creates the middleware function.
     * 
     * @returns The middleware function.
     */
    middleware(): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            if(typeof this.description !== 'undefined') {
                res.locals.description = this.description;
            }
            if(typeof this.keywords !== 'undefined') {
                res.locals.keywords = this.keywords;
            }
            if(typeof this.author !== 'undefined') {
                res.locals.author = this.author;
            }
            if(typeof this.titlePrefix !== 'undefined') {
                res.locals.titlePrefix = this.titlePrefix;
            }
            if(typeof this.titleSuffix !== 'undefined') {
                res.locals.titleSuffix = this.titleSuffix;
            }

            Object.entries(this.otherValues).forEach(([key, value]: [string, string]) => {
                res.locals[key] = value;
            });

            // Continue to the next middleware
            next();
        }
    }
}

/**
 * Middleware wrapper function to set global template values for all pages.
 * 
 * @param options Options for the middleware.
 * @param options.description The description of the website.
 * @param options.keywords The keywords for the website.
 * @param options.author The author of the website.
 * @param options.titlePrefix The prefix for the title of the website.
 * @param options.titleSuffix The suffix for the title of the website.
 * @returns The middleware function.
 */
export function globalTemplateValues(options: { description?: string, keywords?: string, author?: string, titlePrefix?: string, titleSuffix?: string, [key: string]: string | undefined }) {
    const instance = new GlobalTemplateValuesMiddleware({ ...options });

    return instance.middleware.bind(instance);
}