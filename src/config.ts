const config = {
    stackdriver: {
        maxLogSize: {
            /**
             * The max size of a log is 256k, aka 256000 bytes.
             * @note in practice 256k still sees us creating logs as large as 300kb.
             * So we are making this more conservative, down to 128k.
             * @see https://cloud.google.com/logging/quotas#log-limits
             */
            bytes: 128000,
        },
    },
    defaultCloudFunctionRegion: 'us-central1',
};

export default config;
