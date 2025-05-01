import { Application } from 'express';
import { Scopes } from '@BridgemanAccessible/ba-auth';
import Client, { OnAuthCallback } from '@BridgemanAccessible/ba-auth/client';

import { App } from './App';
import { Initializer } from './Initializer';

import { getValueFromEnvironmentVariable } from './utils/env-vars';

type OAuthAppOptions = {
    /** The base URL of the app */
    baseAppUrl?: URL,
    /** The abbreviation of the app */
    appAbbrv?: string, 
    /** The name of the app */
    appName?: string | {
        /** Localized versions of the app name */
        [language: string]: string
    },
    /** The email addresses of the contacts for the app */
    contacts?: string[], 
    /** The scopes an app token COULD ask for (token scopes would have to ask for this or a subset of this list) */
    scopes?: Scopes[], 
    /** The URL of the app's logo */
    logo_url?: URL, 
    /** The URL of the app's terms of service */
    tos_url?: URL, 
    /** The URL of the app's privacy policy */
    policy_url?: URL, 
    /** The type of vault to use for the keystore */
    vault_type?: "azure" | "hashicorp" | "file", 
    /** The default method for authentication */
    auth_default_method?: "query" | "form_post" | "PAR", 
    /** Whether to use JWT as the default authentication method */
    auth_default_use_JWT?: boolean, 
    /** The default response mode for authentication */
    auth_default_response_mode?: 'query' | 'fragment' | 'form_post'
    /** The client secret for the app (if this IS set registration WON'T be done. Because re-registering isn't supported) */
    client_secret?: string
};

export class OAuthApp extends App {
    private onAuth: OnAuthCallback;
    private saveSecret: (secret: string) => void | Promise<void>;

    private baseAppUrl?: URL;
    private appAbbrv?: string;
    private appName?: string | { [language: string]: string };
    private contacts?: string[];
    private scopes?: Scopes[];
    private logo_url?: URL;
    private tos_url?: URL;
    private policy_url?: URL;
    private vault_type?: "azure" | "hashicorp" | "file";
    private auth_default_method?: "query" | "form_post" | "PAR";
    private auth_default_use_JWT?: boolean;
    private auth_default_response_mode?: 'query' | 'fragment' | 'form_post';
    private client_secret?: string;

    /**
     * Create a new OAuth app
     * 
     * This is a more specialized version of the `App` class that is designed to work with the Bridgeman Accessible OAuth system.
     * The only required parameters are the `onAuth` and `saveSecret` callbacks which are called when a user logs in.
     * And when the client secret is generated (and is to be saved) respectively.
     * The `options` parameter allows for tweaking the OAuth details for the app.
     * 
     * Note, the following table of environment variables that are used to set the OAuth details if they aren't provided in the `options` parameter:
     * 
     * | Environment Variable | Is Required                                             | Description                                                                  |
     * | -------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------- |
     * | BASE_APP_URL         | Required if `options.baseAppUrl` isn't provided         | The base URL of the client (app)                                             |
     * | APP_ABBRV            | Required if `options.appAbbrv` isn't provided           | The abbreviation of the client (app)                                         |
     * | APP_NAME             | Required if `options.appName` isn't provided            | The name of the client (only a single non-localized name is supported)       |
     * | CONTACT_EMAIL        | Required if `options.contacts` isn't provided           | A comma-separated list of email addresses to list as contacts for the client |
     * | LOGO_URL	          | Optional (used if `options.logo_url` isn't specified)   | The URL of the client's (app's) logo                                         |
     * | TOS_URL              | Optional (used if `options.tos_url` isn't specified)    | The URL of the client's terms of service                                     |
     * | POLICY_URL           | Optional (used if `options.policy_url` isn't specified) | The URL of the client's privacy policy                                       |
     * | SCOPES	              | Required if `options.scopes` isn't provided             | A comma-separated list of scopes available to the client                     |
     * | VAULT_TYPE	          | Required if in production (`NODE_ENV` is `production`)  | The type of vault to use for the keystore (one of azure, hashicorp, or file) |
     * | APP_SECRET           | Optional (Determines if app should register or not)     | The client secret for the app (if this IS set registration WON'T be done)    |
     * 
     * @param onAuth The callback to call when a user logs in
     * @param saveSecret The callback to call to save the secret
     * @param options The options for the OAuth app
     * @param options.baseAppUrl The base URL of the app
     * @param options.appAbbrv The abbreviation of the app (used for user properties associated with the app)
     * @param options.appName The name of the app
     * @param options.contacts The email addresses of the contacts for the app
     * @param options.scopes The scopes an app token COULD ask for (token scopes would have to ask for this or a subset of this list)
     * @param options.logo_url The URL of the app's logo
     * @param options.tos_url The URL of the app's terms of service
     * @param options.policy_url The URL of the app's privacy policy
     * @param options.vault_type The type of vault to use for the keystore
     * @param options.auth_default_method The default method for authentication
     * @param options.auth_default_use_JWT Whether to use JWT as the default authentication method
     * @param options.auth_default_response_mode The default response mode for authentication
     * @param options.client_secret The client secret for the app (if this IS set registration WON'T be done. Because re-registering isn't supported)
     */
    constructor(onAuth: OnAuthCallback, saveSecret: (secret: string) => void | Promise<void>, options?: OAuthAppOptions) {
        super();
        this.onAuth = onAuth;
        this.saveSecret = saveSecret;

        if(typeof options !== 'undefined') {
            this.baseAppUrl = options.baseAppUrl;
            this.appAbbrv = options.appAbbrv;
            this.appName = options.appName;
            this.contacts = options.contacts;
            this.scopes = options.scopes;
            this.logo_url = options.logo_url;
            this.tos_url = options.tos_url;
            this.policy_url = options.policy_url;
            this.vault_type = options.vault_type;
            this.auth_default_method = options.auth_default_method;
            this.auth_default_use_JWT = options.auth_default_use_JWT;
            this.auth_default_response_mode = options.auth_default_response_mode;
            this.client_secret = options.client_secret;
        }
    }

    /**
     * Setup the OAuth client
     * 
     * This is done here because we need the client to be serving/listening for request in order for the auth library stuff to work properly 
     * (mostly, the server needs to be able to get the client's keys which the client needs to be able to serve)
     * 
     * @param app The app to setup the OAuth client for
     */
    private async setupOAuthClient(app: App) {
        // If the base URL of the app isn't provided, get it from the environment variable
        let baseAppUrl = this.baseAppUrl; 
        if(typeof baseAppUrl === 'undefined') {
            baseAppUrl = new URL(getValueFromEnvironmentVariable('BASE_APP_URL', { description: 'app\'s base URL', blank_allowed: false }));
        }

        // The app abbreviation (used for user properties associated with the app)
        let appAbbrv = this.appAbbrv;
        if(typeof appAbbrv === 'undefined') { 
            appAbbrv = getValueFromEnvironmentVariable('APP_ABBRV', { description: 'app abbreviation', blank_allowed: false });
        }

        console.log(`Attempting to create/register the app:\n\tApp Base URL: ${baseAppUrl}\n\tApp Abbreviation: ${appAbbrv}\n\tApp Name: ${typeof this.appName === 'undefined' ? 'uses APP_NAME environment variable (' + process.env.APP_NAME + ')' : this.appName}\n\tScopes: ${typeof this.scopes === 'undefined' ? 'uses SCOPES environment variable (' + process.env.SCOPES + ')' : this.scopes.join(', ')}`);

        // Because we need this for registration to work properly. It make sense to put it here
        app.getInitializer().getRouter().addOutsideFrameworkRoute('/.well-known/jwks.json');

        const client = await Client.setup(app.getExpressApp(), baseAppUrl, this.onAuth, this.saveSecret, appAbbrv, this.appName, this.scopes, {
            contacts: this.contacts,
            logo_url: this.logo_url,
            tos_url: this.tos_url,
            policy_url: this.policy_url,
            vault_type: this.vault_type,
            auth_default_method: this.auth_default_method,
            auth_default_use_JWT: this.auth_default_use_JWT,
            auth_default_response_mode: this.auth_default_response_mode,
            client_secret: this.client_secret
        });

        client.getSetupRoutes().forEach((route) => {
            console.log(`Adding outside framework route: ${route}`);
            app.getInitializer().getRouter().addOutsideFrameworkRoute(route);
        });
    }

    /**
     * The wrapper method around the `onStart` callback that differentiates the `OAuthApp` from the `App` class.
     * That is, this (the `OAuthApp` class) sets up the OAuth client before calling the client's `onStart` callback.
     * As opposed to the `App` class which just calls the `onStart` callback.
     * 
     * It's done this way so that it's almost entirely transparent the difference between apps that have OAuth and those that don't.
     * 
     * @param app The Express app object (that is now listening)
     */
    async onStart(app: App, callback?: (app: App) => void | Promise<void>) {
        try {
            // Setup the OAuth client.
            // This is done here because we need the client to be serving/listening for requests for the auth library stuff to work 
            // (mostly because the server needs to be able to get the client's keys which it needs to be able to serve)
            await this.setupOAuthClient(app);

            if(typeof callback !== 'undefined') {
                await callback.bind(this)(app);
            }
        }
        catch(err) {
            console.error('Error setting up the BA User Auth');
            console.error('---------------------------------');
            console.error(err);
        }
    }

    /**
     * The main entry point for the app
     * 
     * This largely just wraps the `run` method from the parent class (`App`).
     * However, instead of invoking the provided callback immediately when the client starts.
     * This initializes the app as an OAuth app first and then calls the callback.
     * This lets the app just worry about the `onAuth` callback (what happens when a user logs in) and `saveSecret` callback (that saves the generated client secret, if applicable) 
     * And doesn't have to worry about the OAuth details to make this work.
     * Though it does provide tweaking the OAuth details via options provided to the constructor.
     */
    async run<T extends Initializer>(initializer?: T, callback?: (app: App) => void | Promise<void>) {
        await super.run(initializer, async (app: App) => this.onStart(app, callback));
    }
}