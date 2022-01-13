/**
 * Determines whether we are running on GCloud based on particular Environment variables being set.
 * These vary between Cloud Function and App Engine execution environment, hence the two checks
 * @see https://cloud.google.com/functions/docs/env-var#reserved_keys_key_validation
 * @see https://cloud.google.com/appengine/docs/flexible/nodejs/runtime#environment_variables
 * @see https://cloud.google.com/functions/docs/env-var#nodejs_10_and_subsequent_runtimes
 */
export function isRunningOnGCloud() {
    return process.env.X_GOOGLE_SUPERVISOR_HOSTNAME || process.env.GAE_SERVICE || process.env.FUNCTION_TARGET || process.env.FUNCTION_SIGNATURE_TYPE || process.env.K_SERVICE;
}

/**
 * Detect whether the current running environment is a Google Cloud Function.
 * @see https://cloud.google.com/functions/docs/configuring/env-var#newer_runtimes
 */
export function isCloudFunctionEnvironment() {
    return !!process.env.FUNCTION_TARGET;
}

/**
 * Detect whether the current running environment is on Google Cloud Run.
 * @see https://cloud.google.com/run/docs/reference/container-contract#env-vars
 */
export function isCloudRunEnvironment() {
    return !!process.env.K_REVISION;
}

export function getCloudFunctionNameFromGCloud() {
    return process.env.FUNCTION_NAME || process.env.K_SERVICE;
}
