const config = {
    stackdriver: {
        maxLogSize: {
            /**
             * The max size of a log is 256k, aka 256000 bytes.
             * @see https://cloud.google.com/logging/quotas#log-limits
             */
            bytes: 256000,
        },
    },
    defaultCloudFunctionRegion: 'us-central1',
};

export default config;
