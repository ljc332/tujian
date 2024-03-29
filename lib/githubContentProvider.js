'use strict';

var httpRequest = require('request'),
    util = require('util'),
    q = require('q'),
    path = require('path'),
    marked = require('marked'),
    logger = require('./logger'),
    errors = require('./errors'),
    urlBuilder = require('./githubUrlBuilder.js');

function getContentFromGithub(url) {
  var deferred = q.defer();

  logger.info('getContentFromGithub: ' + url);

  httpRequest.get({url: url, headers: { 'user-agent': 'mdwiki' }}, function (error, response, body) {
    if (error) {
      logger.error('Error while request data from github: ' + error.message);
      deferred.reject(error);
    }
    else if (response.statusCode !== 200) {
      logger.error('Error while request data from github: ' + response.body);
      deferred.reject(new Error(response.statusCode));
    }
    else {
      if (response.headers !== undefined) {
        logger.info('Response from github: statusCode=%s, x-ratelimit-limit: %s, x-ratelimit-remaining: %s ',
                    response.statusCode, response.headers['x-ratelimit-limit'],
                    response.headers['x-ratelimit-remaining']);
      }
      deferred.resolve(body);
    }
  });

  return deferred.promise;
}

function getParsedJsonFromGithub(url) {
  return getContentFromGithub(url).then(JSON.parse);
}

function readItem(item) {
  if (path.extname(item.name) !== '.md') {
    return;
  }
  var fileNameWithoutExt = path.basename(item.name, '.md');

  var page = {
    title: fileNameWithoutExt,
    name: fileNameWithoutExt,
    fileName: item.name,
    sha: item.sha
  };
  return page;
}

function readItems(items) {
  var pages = [];

  items.forEach(function (item) {
    var page = readItem(item);
    if (page !== undefined) {
      pages.push(page);
    }
  });
  return pages;
}

function GitHubContentProvider(userName, repositoryName) {
  this.userName = userName;
  this.repositoryName = repositoryName;
}

GitHubContentProvider.prototype.getPageContent = function (pageName) {
  var deferred = q.defer(),
      url = urlBuilder.buildPageContentUrl(this.userName, this.repositoryName, pageName);

  if (this.oauth !== undefined) {
    url += urlBuilder.withAccessToken(this.oauth);
  }

  getContentFromGithub(url)
    .then(deferred.resolve)
    .catch(function (error) {
      if (error.message === '404') {
        logger.error('Error 404 while fetching the content for page %s', pageName);
        deferred.reject(new errors.FileNotFoundError('page not found', pageName));
      } else {
        logger.error('Error while fetching the content for page %s: %s', pageName, error);
        deferred.reject(error);
      }
    });

  return deferred.promise;
};

GitHubContentProvider.prototype.getPageContentAsHtml = function (pageName) {
  var deferred = q.defer();

  this.getPageContent(pageName)
    .then(marked)
    .then(deferred.resolve)
    .catch(deferred.reject);

  return deferred.promise;
};

GitHubContentProvider.prototype.getPages = function () {
  var that = this;
  var deferred = q.defer(),
      url = urlBuilder.buildPagesUrl(that.userName, that.repositoryName);

  if (this.oauth !== undefined) {
    url += urlBuilder.withAccessToken(this.oauth);
  }

  getParsedJsonFromGithub(url)
    .then(function (items) {
      deferred.resolve(readItems(items));
    })
    .catch(function (error) {
      if (error.message === '404') {
        deferred.reject(new errors.RepositoryNotExistsError('The user or repository could not be found', that.userName, that.repositoryName));
      }
      else {
        logger.error('Error while fetching the content for user %s in repository %s: %s', that.userName, that.repositoryName, error);
        deferred.reject(error);
      }
    });

  return deferred.promise;
};

GitHubContentProvider.prototype.getPage = function (pageName) {
  var that = this;
  var deferred = q.defer(),
      url = urlBuilder.buildPageUrl(that.userName, that.repositoryName, pageName);

  if (this.oauth !== undefined) {
    url += urlBuilder.withAccessToken(this.oauth);
  }

  getParsedJsonFromGithub(url)
    .then(function (item) {
      deferred.resolve(readItem(item));
    })
    .catch(function (error) {
      if (error.message === '404') {
        logger.error('Error 404 while fetching the page %s', pageName);
        deferred.reject(new errors.FileNotFoundError('page not found', pageName));
      } else {
        logger.error('Error while fetching the page %s: %s', pageName, error);
        deferred.reject(error);
      }
    });

  return deferred.promise;
};

GitHubContentProvider.prototype.search = function (searchTerm) {
  var deferred = q.defer(),
      url = urlBuilder.buildSearchUrl(this.userName, this.repositoryName, searchTerm);

  if (this.oauth !== undefined) {
    url += urlBuilder.withAccessToken(url, this.oauth);
  }

  getParsedJsonFromGithub(url)
    .then(function (searchResult) {
      deferred.resolve(readItems(searchResult.items));
    })
    .catch(deferred.reject);

  return deferred.promise;
};

GitHubContentProvider.prototype.fetchStaticFile = function (request, resp) {
  var url = urlBuilder.buildStaticFileUrl(this.userName, this.repositoryName, request.path);

  if (this.oauth !== undefined) {
    url += urlBuilder.withAccessToken(url, this.oauth);
  }

  var githubRequest = httpRequest(url);
  request.pipe(githubRequest);
  githubRequest.pipe(resp);
};

GitHubContentProvider.prototype.savePage = function (commitMessage, pageName, pageContent) {
  var deferred = q.defer();

  this.getPage(pageName)
    .then(function (page) {
      this.createOrUpdatePage(commitMessage, pageName, pageContent, page.sha).then(deferred.resolve).catch(deferred.reject);
    }.bind(this))
    .catch(function (error) {
      if (error instanceof errors.FileNotFoundError) {
        this.createOrUpdatePage(commitMessage, pageName, pageContent).then(deferred.resolve).catch(deferred.reject);
      } else {
        deferred.reject(error);
      }
    }.bind(this));

  return deferred.promise;
};

GitHubContentProvider.prototype.createOrUpdatePage = function (commitMessage, pageName, pageContent, sha) {
  var deferred = q.defer(),
      url = urlBuilder.buildPageUrl(this.userName, this.repositoryName, pageName).concat(urlBuilder.withAccessToken(this.oauth));

  var messageToGithub = {
    message: commitMessage,
    content: new Buffer(pageContent).toString('base64'),
    branch: 'master'
  };

  if (sha) {
    messageToGithub.sha = sha;
  }

  httpRequest.put({ url: url, headers: { 'user-agent': 'mdwiki' }, body: messageToGithub, json: true }, function (error, response, body) {
    if (error) {
      logger.error('Error while put changes to github: %s', error);
      deferred.reject(error);
      return;
    } else if (response.statusCode !== 200 && response.statusCode !== 201) {
      logger.error('Error while put changes to github: %s', response.body.message);
      error = new Error(util.format('Unexpected response from github: %s', response.body.message));
      error.status = response.statusCode;
      deferred.reject(error);
      return;
    }
    response.body = marked(pageContent);
    deferred.resolve(response);
  });

  return deferred.promise;
};


GitHubContentProvider.prototype.deletePage = function (pageName) {
  var deferred = q.defer(),
      url = urlBuilder.buildPageUrl(this.userName, this.repositoryName, pageName).concat(urlBuilder.withAccessToken(this.oauth));

  this.getPage(pageName).then(function (page) {
    var messageToGithub = {
      message: 'Delete the page ' + pageName,
      branch: 'master',
      sha: page.sha
    };

    logger.info('message: ', messageToGithub);

    httpRequest.del({ url: url, headers: { 'user-agent': 'mdwiki' }, body: messageToGithub, json: true }, function (error, response, body) {
      if (error) {
        logger.error('Error while put changes to github: %s', error);
        deferred.reject(error);
        return;
      }
      deferred.resolve(response);
    });
  }).catch(deferred.reject);

  return deferred.promise;
};

module.exports = GitHubContentProvider;
