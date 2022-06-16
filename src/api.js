const {Router} = require('express');

const routes = Router();

const handlePost = (req, res) => res.json({message: 'hello'});

routes.post('/my-resource', handlePost);

module.exports = () => routes;
