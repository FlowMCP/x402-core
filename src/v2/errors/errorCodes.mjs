// Error Codes for X402 v2 (Spec-compliant)

export const ErrorCodes = {
    // General payload errors
    INVALID_PAYLOAD: 'invalid_payload',

    // Payment requirements errors
    INVALID_PAYMENT_REQUIREMENTS: 'invalid_payment_requirements',

    // Network errors
    INVALID_NETWORK: 'invalid_network',

    // Exact EVM specific errors
    INVALID_EXACT_EVM_PAYLOAD_SIGNATURE: 'invalid_exact_evm_payload_signature',
    INVALID_EXACT_EVM_PAYLOAD_VALUE: 'invalid_exact_evm_payload_value',
    INVALID_EXACT_EVM_PAYLOAD_NONCE: 'invalid_exact_evm_payload_nonce',
    INVALID_EXACT_EVM_PAYLOAD_TIMEOUT: 'invalid_exact_evm_payload_timeout',

    // Configuration errors
    INVALID_CONFIGURATION: 'invalid_configuration',

    // Settlement errors
    SETTLEMENT_FAILED: 'settlement_failed',
    SIMULATION_FAILED: 'simulation_failed',

    // Selection errors
    NO_MATCHING_PAYMENT_OPTION: 'no_matching_payment_option'
}
