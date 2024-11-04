export enum EnumErrorCode {
    NO_AUDIO_PROVIDED,
    TOO_LONG_FILE,
    UNSUPPORTED_CODEC,
    DOWNLOADING_ERROR,
    PROCESSING_ERROR
}

export const errorCodeToTextMap = {
    [EnumErrorCode.NO_AUDIO_PROVIDED]: "No audio provided :(",
    [EnumErrorCode.TOO_LONG_FILE]: "Too long audio :(",
    [EnumErrorCode.UNSUPPORTED_CODEC]: "Not supported audio codec :(",
    [EnumErrorCode.DOWNLOADING_ERROR]: "Something went wrong while capturing audio info. In Progress -> Closed :(",
    [EnumErrorCode.PROCESSING_ERROR]: "Something went bad while processing command. In Progress -> Closed :("
};

export enum EnumInfoCode {
    START_OPERATION,
}

export const infoCodeToTextMap = {
    [EnumInfoCode.START_OPERATION]: "Received your audio. Open -> In Progress :)",
};
