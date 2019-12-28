'use strict';

// Including Lala's modules.
const FileResponse = require('./FileResponse');
const {
    InvalidArgumentException
} = require('../../Exceptions');

/**
 *
 */
class StreamedFileResponse extends FileResponse {
    /**
     *
     * @param request
     * @param response
     * @return {Promise<void>}
     */
    async apply(request, response){

    }
}

module.exports = StreamedFileResponse;
