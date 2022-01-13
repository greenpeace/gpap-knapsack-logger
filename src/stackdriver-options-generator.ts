import {MonitoredResource} from "@google-cloud/logging-bunyan/build/src/types/core";
import {isCloudFunctionEnvironment, isCloudRunEnvironment} from "./gcp-environment-detection";
import {getCloudFunctionDescriptor, getCloudRunDescriptor} from "./gcp-environment-polyfill";

/**
 * Generate the resource object for Stackdriver Logging.
 * @note sometimes Logging Bunyan does not correctly populate these labels & resources.
 */
export function generateStackdriverResource(): MonitoredResource | undefined {
    if (isCloudFunctionEnvironment()) {
        return getCloudFunctionDescriptor();
    }
    else if (isCloudRunEnvironment()) {
        return getCloudRunDescriptor();
    }


    return undefined;
}