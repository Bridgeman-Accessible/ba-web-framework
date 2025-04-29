/**
 * Strip quotes from a string (if they are present)
 * 
 * This is useful for environment variables because otherwise there can be unexpected behaviors between quoted and unquoted values
 * 
 * @param value The value to strip quotes from
 * @returns The value without quotes
 */
function stripQuotes(value: string): string {
    // Note we check BOTH the start and end of the string for quotes
    // This is because we don't want to strip quotes from the middle of the string
    // Or if for one reason or another there are quotes at one end but not the other
    // 
    // For instance, `abc"value"abc` should NOT be stripped to `abcvalueabc` 
    // Further, `"value"abc` should NOT be stripped to `valueabc`
    // Similarly, `value"abc"` should NOT be stripped to `valueabc`
    // But `"value"` SHOULD BE stripped to `value`
    // 
    // In theory, the quotes should be used to avoid issues with spaces and other special characters and the encapsulated value should be treated as a single value and quotes removed
    // But, for now, we'll just strip the quotes as described above
    if(value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1);
    }

    return value;
}

/**
 * Get the value from an environment variable in a safe way
 * 
 * @param varname The name of the environment variable to get the value from
 * @param options Options for getting the value from the environment variable. Optional.
 * @param options.description A human readable description of the environment variable (used for error messages). Optional.
 * @param options.default The default value to use if the environment variable is not defined. Optional.
 * @param options.blank_allowed Whether a blank value is allowed. Optional. Default is true (blanks are allowed).
 * @throws If the environment variable is not defined
 * @returns The value of the environment variable
 */
export function getValueFromEnvironmentVariable(varname: string, options?: { description?: string, default?: string, blank_allowed?: boolean }): string {
    // Verify if the environment variable is defined
    if(typeof process.env[varname] === 'undefined' || process.env[varname] === null) {
        if(typeof options !== 'undefined' && typeof options.default !== 'undefined') {
            // Because the variable is not defined, but a default value is provided, return the default value
            return options.default;
        }
        else {
            // Because the variable is not defined AND no default value is provided, throw an error
            throw new Error(`The ${typeof options !== 'undefined' && typeof options.description !== 'undefined' ? options.description : ''} (${varname} environment variable) is not defined`);
        }
    }

    // If the value is blank and blanks are EXPLICITLY not allowed, return the default or throw an error
    if(typeof options !== 'undefined' && typeof options.blank_allowed !== 'undefined' && !options.blank_allowed && process.env[varname] === '') {
        if(typeof options.default !== 'undefined') {
            // Because the variable is blank, but blanks aren't allowed AND a default value is provided, return the default value
            return options.default;
        }
        else {
            // Because the variable is blank, but blanks aren't allowed AND no default value is provided, throw an error
            throw new Error(`The ${typeof options.description !== 'undefined' ? options.description : ''} (${varname} environment variable) cannot be blank`);
        }
    }

    // Strip quotes from the value before returning it
    return stripQuotes(process.env[varname]);
}