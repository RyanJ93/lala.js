'use strict';

const lala = require('../index');

lala.Command.addCommand('com.lala.route.create', () => {
    console.log(__dirname);
});
