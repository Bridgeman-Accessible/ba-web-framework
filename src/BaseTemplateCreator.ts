import path from 'path';
import fse from 'fs-extra';
import { JSDOM } from 'jsdom';

/** The inputs for setting up the meta tags */
type SetupMetaTagInputs = {
    /** Description for the Meta description tag */
    description?: string,
    /** Keywords for the Meta keywords tag */
    keywords?: string[],
    /** author for the Meta author tag */
    author?: string,
}

/** The inputs for the `setupHead` method */
type SetupHeadInputs = SetupMetaTagInputs & {
    /** if to include Stripe script(s) */
    includeStripe?: boolean,
    /** If to include Foundation Framework script(s) */
    includeFoundationFramework?: boolean,
    /** The Font Awesome kit to include (if applicable) */
    fontAwesomeKit?: string
}

/** The inputs for the base template */
export type BaseTemplateInputs = SetupHeadInputs;

/**
 * A class to create a base template for an app
 */
export class BaseTemplateCreator {
    /** The output of the template */
    private output: string;

    /** The DOM of the template */
    private dom: JSDOM;

    /** The document of the template */
    private document: Document;

    /**
     * The constructor for the BaseTemplateCreator class
     * 
     * @param language The human language of the document (default: English/`en`)
     */
    constructor(language: string = 'en') {
        this.output = '';

        // Create the base document
        const { dom, document } = this.createBaseDocument(language);
        this.dom = dom;
        this.document = document;
    }

    /**
     * Create a base document
     * 
     * @param language The human language of the document (default: English/`en`)
     * @returns The base document's DOM and document
     */
    private createBaseDocument(language = 'en') {
        // Create a basic HTML document (as a string)
        const docTypeTag = '<!DOCTYPE html>';
        const emptyHeadTags = '<head></head>';
        const emptyBodyTags = '<body></body>';
        const htmlLanguageProperty = `lang="${language}"`;
        const basicHtmlTags = `<html ${htmlLanguageProperty}>${emptyHeadTags}${emptyBodyTags}</html>`;
        const domStr = `${docTypeTag}${basicHtmlTags}`;
        
        // Create a DOM and document from the string
        const dom = new JSDOM(domStr);
        const document = dom.window.document;
        
        return { dom, document };
    }

    /**
     * Create the meta tag section of the head tag
     * 
     * @param inputs The inputs to use for setting up the meta tag section of the head tag
     * @returns The string representation of the meta tag section of the head tag
     */
    private createHeadMetaTagSection(inputs?: SetupMetaTagInputs) {
        let output = '';

        // Create the meta charset tag
        const metaCharsetTag = this.document.createElement('meta');
        metaCharsetTag.setAttribute('charset', 'utf-8');

        // Create the meta description tag
        // Note, if no description is given then we specify a template string that allows specifying it later
        const metaDescTag = this.document.createElement('meta');
        metaDescTag.name = 'description';
        metaDescTag.content = typeof inputs !== 'undefined' && typeof inputs.description !== 'undefined' ? inputs.description : '<% if(typeof description !== \'undefined\') { %><%= description %><% } %>';
        
        // Create the meta keywords tag
        // Note, if no keywords are given then we specify a template string that allows specifying it later
        const metaKeywordsTag = this.document.createElement('meta');
        metaKeywordsTag.name = 'keywords';
        metaKeywordsTag.content = typeof inputs !== 'undefined' && typeof inputs.keywords !== 'undefined' ? inputs.keywords.join(', ') : '<% if(typeof keywords !== \'undefined\') { %><%= keywords.join(\', \') %><% } %>';
        
        // Create the meta author tag
        // Note, if no author is given then we specify a template string that allows specifying it later
        const metaAuthorTag = this.document.createElement('meta');
        metaAuthorTag.name = 'author';
        metaAuthorTag.content = typeof inputs !== 'undefined' && typeof inputs.author !== 'undefined' ? inputs.author : '<% if(typeof author !== \'undefined\') { %><%= author %><% } %>';
        
        // Create the meta viewport tag
        const metaViewportTag = this.document.createElement('meta');
        metaViewportTag.name = 'viewport';
        const viewportWidth = 'device-width';
        const viewportWidthParam = `width=${viewportWidth}`;
        const viewportScale = '1.0';
        const viewportScaleParam = `initial-scale=${viewportScale}`;
        metaViewportTag.content = [viewportWidthParam, viewportScaleParam].join(', ');

        output += '\t\t' + metaCharsetTag.outerHTML + '\n';
        output += '\t\t' + metaDescTag.outerHTML + '\n';
        output += '\t\t' + metaKeywordsTag.outerHTML + '\n';
        output += '\t\t' + metaAuthorTag.outerHTML + '\n';
        output += '\t\t' + metaViewportTag.outerHTML + '\n';

        return output;
    }

    /**
     * Create the title tag for the template
     * 
     * @returns The string representation of the title tag
     */
    private createTitleTag() {
        // Create the title tag
        const titleTag = this.document.createElement('title');
        const titlePrefixPortion = '<% if (typeof titlePrefix !== \'undefined\') { %><%= titlePrefix %><% } %>';
        const titlePortion = '<% if(typeof title !== \'undefined\') { %><%= title %><% } %>';
        const titleSuffixPortion = '<% if (typeof titleSuffix !== \'undefined\') { %><%= titleSuffix %><% } %>';
        titleTag.innerHTML = `${titlePrefixPortion}${titlePortion}${titleSuffixPortion}`;

        return '\t\t' + titleTag.outerHTML + '\n';
    }

    /**
     * Create the extra styles block for the template
     * 
     * This is a portion of the `<head></head>` tag within the template that allows a individual controller to specify additional styles.
     * In particular, it allows a controller to specify additional CSS stylesheets to include in the page.
     * 
     * @returns The string representation of the extra styles block
     */
    private createExtraStylesBlock() {
        let output = '';
        
        const extraStylesArrayLinkTag = this.document.createElement('link');
        extraStylesArrayLinkTag.rel = 'stylesheet';
        extraStylesArrayLinkTag.type = 'text/css';
        extraStylesArrayLinkTag.href = '/css/<%= style %>.css';
        
        const extraStylesLinkTag = this.document.createElement('link');
        extraStylesLinkTag.rel = 'stylesheet';
        extraStylesLinkTag.type = 'text/css';
        extraStylesLinkTag.href = '/css/<%= extraStyles %>.css';
        
        output += '<%# Add any additional stylesheets specified within a controller etc... %>' + '\n';
        output += '<%# This can either be a singular string or a array of strings %>' + '\n';
        output += '<%# Note, that the string should be the name of the stylesheet WITHOUT the `.css` extension and exist in the `css/` directory %>' + '\n';
        output += '<% if (typeof extraStyles !== \'undefined\') { %>' + '\n';
        output += '\t' + '<% if (Array.isArray(extraStyles)) { %>' + '\n';
        output += '\t\t' + '<%# Because it\'s an array, we need to loop through each stylesheet and include it %>' + '\n';
        output += '\t\t' + '<% for (let style of extraStyles) { %>' + '\n';
        output += '\t\t\t' + extraStylesArrayLinkTag.outerHTML + '\n';
        output += '\t\t' + '<% } %>' + '\n';
        output += '\t' + '<% } else { %>' + '\n';
        output += '\t\t' + '<%# Include the singular stylesheet %>' + '\n';
        output += '\t\t' + extraStylesLinkTag.outerHTML +'\n';
        output += '\t' + '<% } %>' + '\n';
        output += '<% } %>';

        return output;
    }

    /**
     * Create the styles section of the head tag
     * 
     * @param includeFoundationFramework If to include the Foundation Framework styles
     * @returns The string representation of the styles section of the head tag
     */
    private createHeadStylesSection(includeFoundationFramework: boolean = false) {
        let output = '';

        const stylesComment = this.document.createComment('Styles');
        output += '\t\t' + `<!-- ${stylesComment.data} -->` + '\n';

        const customStyles = this.document.createComment('Custom styling');
        output += '\t\t' + `<!-- ${customStyles.data} -->` + '\n';

        const baseStylesLinkTag = this.document.createElement('link');
        baseStylesLinkTag.rel = 'stylesheet';
        baseStylesLinkTag.type = 'text/css';
        baseStylesLinkTag.href = '/css/style.css';
        output += '\t\t' + baseStylesLinkTag.outerHTML + '\n';

        const accessibilityStylesLinkTag = this.document.createElement('link');
        accessibilityStylesLinkTag.rel = 'stylesheet';
        accessibilityStylesLinkTag.type = 'text/css';
        accessibilityStylesLinkTag.href = '/css/accessibility.css';
        output += '\t\t' + accessibilityStylesLinkTag.outerHTML + '\n';

        if(includeFoundationFramework) {
            const foundationFrameworkComment = this.document.createComment('Foundation Framework');
            
            const foundationFrameworkLinkTag = this.document.createElement('link');
            foundationFrameworkLinkTag.rel = 'stylesheet';
            foundationFrameworkLinkTag.type = 'text/css';
            foundationFrameworkLinkTag.href = '/css/app.css';

            output += '\t\t' + `<!-- ${foundationFrameworkComment.data} -->` + '\n';
            output += '\t\t' + `${foundationFrameworkLinkTag.outerHTML}` + '\n';
        }

        //const sassComment = this.document.createComment('SASS components');
        
        /*const systemThemedBackgroundLinkTag = this.document.createElement('link');
        systemThemedBackgroundLinkTag.rel = 'stylesheet';
        systemThemedBackgroundLinkTag.type = 'text/css';
        systemThemedBackgroundLinkTag.href = '/css/components/system-themed-background.css';*/

        //output += '\t\t' + `<!-- ${sassComment.data} -->` + '\n';
        //output += '\t\t' + `${systemThemedBackgroundLinkTag.outerHTML}` + '\n';

        const ejsExtraStylesBlock = this.createExtraStylesBlock();
        output += '\t\t' + ejsExtraStylesBlock.replaceAll('\n', '\n\t\t') + '\n';

        return output;
    }

    /**
     * Create the extra scripts block for the template
     * 
     * This is a portion of the `<head></head>` tag within the template that allows a individual controller to specify additional scripts
     * These scripts can come in a few different forms which is one of the reason it requires a template block like this.
     * 
     * @returns The string representation of the extra scripts block
     */
    private createExtraScriptsBlock() {
        let output = '';

        const htmlBlockComment = this.document.createComment('Controller specific scripts');
        
        const arrayItemStringExternalScriptTag = this.document.createElement('script');
        arrayItemStringExternalScriptTag.type = 'application/javascript';
        arrayItemStringExternalScriptTag.src = '<%= script %>';

        const arrayItemStringLocalScriptTag = this.document.createElement('script');
        arrayItemStringLocalScriptTag.type = 'application/javascript'
        arrayItemStringLocalScriptTag.src = '/js/<%= script %>.js' 
        arrayItemStringLocalScriptTag.defer = true;

        const singularStringExternalScriptTag = this.document.createElement('script');
        singularStringExternalScriptTag.type = 'application/javascript' 
        singularStringExternalScriptTag.src = '<%= extraScripts %>';

        const singularStringLocalScriptTag = this.document.createElement('script');
        singularStringLocalScriptTag.type = 'application/javascript'
        singularStringLocalScriptTag.src = '/js/<%= extraScripts %>.js' 
        singularStringLocalScriptTag.defer = true;
        
        output += `<!-- ${htmlBlockComment.data} -->` + '\n';
        output += '<%# Add any additional scripts specified within a controller etc...                                                                                                                                                           %>' + '\n';
        output += '<%#                                                                                                                                                                                                                           %>' + '\n';
        output += '<%# Note, that these can come in multiple formats as described in the table below:                                                                                                                                            %>' + '\n';
        output += '<%# | Type   | Description                                         | Format                                                                  | Use Cases                                                                   |  %>' + '\n';
        output += '<%# | ------ | --------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------- |  %>' + '\n';
        output += '<%# | string | The name of the script to include                   | `<script name>`                                                         | Simple include of the script                                                |  %>' + '\n';
        output += '<%# | object | An object about the script to include               | `{ script: \'<script name>\', defer: <true/false> }`                      | Being more explicit about script\'s properties (ex. defer vs. async, etc...) |  %>' + '\n';
        output += '<%# | array  | An array of strings or objects (as described above) | `[ \'<script name>\', { script: \'<script name>\', defer: <true/false> } ]` | Include multiple scripts                                                    |  %>' + '\n';
        output += '<%#                                                                                                                                                                                                                           %>' + '\n';
        output += '<%# The string or `.script` property of the object should be the script name WITHOUT the `.js` extension and exist in the `js/` directory if it\'s a "local" script.                                                           %>' + '\n';
        output += '<%# Or should be the full URL if it\'s a "external" script                                                                                                                                                                     %>' + '\n';
        output += '<% if (typeof extraScripts !== \'undefined\') { %>' + '\n';
        output += '\t' + '<% if (Array.isArray(extraScripts)) { %>' + '\n';
        output += '\t\t' + '<%# Because it\'s an array, we need to loop through each script and include it %>' + '\n';
        output += '\t\t' + '<% for (let script of extraScripts) { %>' + '\n';
        output += '\t\t\t' + '<% if(typeof script === \'object\') { %>' + '\n';
        output += '\t\t\t\t' + '<%# Because the current array items is an object we use the `.script` and `.defer` properties to include it %>' + '\n';
        output += '\t\t\t\t' + '<% if(script.script.startsWith(\'http\') || script.script.startsWith(\'https\')) { %>' + '\n';
        output += '\t\t\t\t\t' + '<%# Because the `.script` property starts with `http` or `https` we assume it\'s an "external" script and include it as a straight URL %>' + '\n';
        output += '\t\t\t\t\t' + '<script type="application/javascript" src="<%= script.script %>" <% if(script.defer) { %>defer<% } %>></script>' + '\n';
        output += '\t\t\t\t' + '<% } else { %>' + '\n';
        output += '\t\t\t\t\t' + '<%# Because the `.script` property doesn\'t start with `http` or `https` we assume it\'s a "local" script and include it as a local script (from the `js/` folder and with a `.js` extension) %>' + '\n';
        output += '\t\t\t\t\t' + '<script type="application/javascript" src="/js/<%= script.script %>.js" <% if(script.defer) { %>defer<% } %>></script>' + '\n';
        output += '\t\t\t\t' + '<% } %>' + '\n';
        output += '\t\t\t' + '<% } else { %>' + '\n';
        output += '\t\t\t\t' + '<% if(script.startsWith(\'http\') || script.startsWith(\'https\')) { %>' + '\n';
        output += '\t\t\t\t\t' + '<%# Because the string starts with `http` or `https` we assume it\'s an "external" script and include it as a straight URL %>' + '\n';
        output += '\t\t\t\t\t' + arrayItemStringExternalScriptTag.outerHTML + '\n';
        output += '\t\t\t\t' + '<% } else { %>' + '\n';
        output += '\t\t\t\t\t' + '<%# Because the string doesn\'t start with `http` or `https` we assume it\'s a "local" script and include it as a local script (from the `js/` folder and with a `.js` extension) %>' + '\n';
        output += '\t\t\t\t\t' + arrayItemStringLocalScriptTag.outerHTML + '\n';
        output += '\t\t\t\t' + '<% } %>' + '\n';
        output += '\t\t\t' + '<% } %>' + '\n';
        output += '\t\t' + '<% } %>' + '\n';
        output += '\t' + '<% } else if (typeof extraScripts === \'object\') { %>' + '\n';
        output += '\t\t' + '<% if(extraScripts.script.startsWith(\'http\') || extraScripts.script.startsWith(\'https\')) { %>' + '\n';
        output += '\t\t\t' + '<%# Because the `.script` property of the singular object starts with `http` or `https` we assume it\'s an "external" script and include it as a straight URL %>' + '\n';
        output += '\t\t\t' + '<script type="application/javascript" src="<%= extraScripts.script %>" <% if(extraScripts.defer) { %>defer<% } %>></script>' + '\n';
        output += '\t\t' + '<% } else { %>' + '\n';
        output += '\t\t\t' + '<%# Because the `.script` property of the singular object doesn\'t start with `http` or `https` we assume it\'s a "local" script and include it as a local script (from the `js/` folder and with a `.js` extension) %>' + '\n';
        output += '\t\t\t' + '<script type="application/javascript" src="/js/<%= extraScripts.script %>.js" <% if(extraScripts.defer) { %>defer<% } %>></script>' + '\n';
        output += '\t\t' + '<% } %>' + '\n';
        output += '\t' + '<% } else { %>' + '\n';
        output += '\t\t' + '<% if(extraScripts.startsWith(\'http\') || extraScripts.startsWith(\'https\')) { %>' + '\n';
        output += '\t\t\t' + '<%# Because the singular string starts with `http` or `https` we assume it\'s an "external" script and include it as a straight URL %>' + '\n';
        output += '\t\t\t' + singularStringExternalScriptTag.outerHTML + '\n';
        output += '\t\t' + '<% } else { %>' + '\n';
        output += '\t\t\t' + '<%# Because the singular string doesn\'t start with `http` or `https` we assume it\'s a "local" script and include it as a local script (from the `js/` folder and with a `.js` extension) %>' + '\n';
        output += '\t\t\t' + singularStringLocalScriptTag.outerHTML + '\n';
        output += '\t\t' + '<% } %>' + '\n';
        output += '\t' + '<% } %>' + '\n';
        output += '<% } %>' + '\n';

        return output;
    }

    /**
     * Create the scripts section of the head tag
     * 
     * @param includeStripe If to include the Stripe script(s)
     * @param includeFoundationFramework If to include the Foundation Framework script(s)
     * @param fontAwesomeKit The Font Awesome kit to include (if applicable)
     * @returns The string representation of the scripts section of the head tag
     */
    private createHeadScriptsSection(includeStripe: boolean = false, includeFoundationFramework: boolean = false, fontAwesomeKit?: string) {
        let output = '';

        const scriptsComment = this.document.createComment('Scripts');
        output += '\t\t' + `<!-- ${scriptsComment.data} -->` + '\n';

        if (includeStripe) {
            const stripeScriptTag = this.document.createElement('script');
            stripeScriptTag.src = 'https://js.stripe.com/v3';
            stripeScriptTag.async = true;

            output += '\t\t' +  stripeScriptTag.outerHTML + '\n';
        }
        
        if(typeof fontAwesomeKit !== 'undefined') {
            const fontAwesomeScriptTag = this.document.createElement('script');
            fontAwesomeScriptTag.src = `https://kit.fontawesome.com/${fontAwesomeKit}.js`;
            fontAwesomeScriptTag.crossOrigin = 'anonymous';

            output += '\t\t' + fontAwesomeScriptTag.outerHTML + '\n'
        }
        
        if(includeFoundationFramework) {
            const foundationFrameworkComment = this.document.createComment('Foundation Framework');
            
            const foundationFrameworkScriptTag = this.document.createElement('script');
            foundationFrameworkScriptTag.type = 'application/javascript';
            foundationFrameworkScriptTag.src = '/js/foundation/main.js';
            foundationFrameworkScriptTag.defer = true;

            output += '\t\t' + `<!-- ${foundationFrameworkComment.data} -->` + '\n';
            output += '\t\t' + foundationFrameworkScriptTag.outerHTML + '\n';
        }

        const ejsExtraScriptsBlock = this.createExtraScriptsBlock();
        output += '\t\t' + ejsExtraScriptsBlock.replaceAll('\n', '\n\t\t') + '\n';

        return output;
    }

    /**
     * Setup the head portion of the document (`<head></head>` tag)
     * 
     * @param inputs The inputs to use for setting up the head portion of the document
     * @returns The string representation of the head portion of the document
     */
    private setupHead(inputs?: SetupHeadInputs) {
        const headTag = this.document.querySelector('head');
        
        if (!headTag) {
            console.error('Head tag not found');
            return;
        }

        const includeFoundationFramework = typeof inputs !== 'undefined' && typeof inputs.includeFoundationFramework !== 'undefined' ? inputs.includeFoundationFramework : false;
        const includeStripe = typeof inputs !== 'undefined' && typeof inputs.includeStripe !== 'undefined' ? inputs.includeStripe : false;

        let headTagContents = headTag.innerHTML + '\n';
        headTagContents += this.createHeadMetaTagSection(inputs);
        headTagContents += this.createTitleTag();
        headTagContents += this.createHeadStylesSection(includeFoundationFramework);
        headTagContents += this.createHeadScriptsSection(includeStripe, includeFoundationFramework, inputs?.fontAwesomeKit);

        headTag.innerHTML = headTagContents;
    }

    /**
     * Create the header block for the template
     * 
     * @returns The string representation of the header block
     */
    private createHeaderBlock() {
        let output = '';

        output += "<% if(typeof header !== 'undefined') { %>" + '\n';
        output += '\t' + '<%- include(header) %>' + '\n';
        output += '<% } else { %>' + '\n';
        output += '\t' + "<%- include('includes/header.ejs') %>" + '\n';
        output += '<% } %>';

        return output;
    }

    /**
     * Create the footer block for the template
     * 
     * @return The string representation of the footer block
     */
    private createFooterBlock() {
        let output = '';
        
        output += "<% if(typeof footer !== 'undefined') { %>" + '\n';
        output += '\t' + '<%- include(footer) %>' + '\n';
        output += '<% } else { %>' + '\n';
        output += '\t' + "<%- include('includes/footer.ejs') %>" + '\n';
        output += '<% } %>';

        return output;
    }

    /**
     * Setup the body portion of the document (`<body></body>` tag)
     * 
     * @returns The string representation of the body portion of the document
     */
    private setupBody() {
        const skipLink = this.document.createElement('a');
        skipLink.id = 'skip-link';
        skipLink.href = '#main';
        skipLink.innerText = 'Skip to main content';
        this.document.body.appendChild(skipLink);
        
        const contentsDiv = this.document.createElement('div');
        contentsDiv.id = 'contents';
        
        const headerElem = this.document.createElement('header');
        let ejsHeaderIncludeBlock = this.createHeaderBlock();
        headerElem.innerHTML = ejsHeaderIncludeBlock;
        contentsDiv.appendChild(headerElem);
        
        const mainElem = this.document.createElement('main');
        mainElem.id = 'main';
        
        const containerDiv = this.document.createElement('div');
        containerDiv.classList.add('container');
        
        const contentDiv = this.document.createElement('div');
        contentDiv.classList.add('content');
        contentDiv.innerHTML = '<%- include(page) %>';
        containerDiv.appendChild(contentDiv);

        mainElem.appendChild(containerDiv);
        
        contentsDiv.appendChild(mainElem);
        
        const footerElem = this.document.createElement('footer');
        const ejsFooterIncludeBlock = this.createFooterBlock();
        footerElem.innerHTML = ejsFooterIncludeBlock;
        contentsDiv.appendChild(footerElem);
        
        this.document.body.appendChild(contentsDiv);
    }

    /**
     * Prepare the output of the template for writing to a file
     */
    private prepare() {
        this.output = this.dom.serialize()
            // Fixing the EJS tags
            .replaceAll('&lt;%', '<%')
            .replaceAll('%&gt;', '%>')
            // Logical operators (particularly used within EJS tags)
            .replaceAll('&amp;&amp;', '&&')
            .replaceAll(' &gt; ', ' > ')
            .replaceAll(' &lt; ', ' < ');
    }

    /**
     * Write the template out to a `base.ejs` file
     * 
     * @param folder The folder where the file should be written to
     */
    private write(folder: string) {
        fse.writeFileSync(path.resolve(folder, 'base.ejs'), this.output);
    }

    /**
     * The static method to create a base template
     * 
     * @param folder The folder to write the base template to 
     * @param baseTemplateInputs The inputs to use for the base template
     */
    static create(folder: string = 'pages', baseTemplateInputs?: BaseTemplateInputs) {
        // Create the base template creator object (sets up an initial document to work with)
        const templateCreator = new BaseTemplateCreator();

        // Sets up the head portion of the document
        templateCreator.setupHead(baseTemplateInputs);
        templateCreator.setupBody();
        templateCreator.prepare();
        templateCreator.write(folder);
    }
}