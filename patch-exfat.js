const fs = require('fs');

// Only apply filesystem patches on Windows environments
if (process.platform === 'win32') {
  const originalReadlink = fs.readlink;
  const originalReadlinkSync = fs.readlinkSync;

  fs.readlinkSync = function (path, options) {
    try {
      return originalReadlinkSync.call(fs, path, options);
    } catch (error) {
      if (error && error.code === 'EISDIR') {
        error.code = 'EINVAL';
        error.errno = -4071;
        error.message = error.message.replace('EISDIR: illegal operation on a directory', 'EINVAL: invalid argument');
      }
      throw error;
    }
  };

  fs.readlink = function (path, options, callback) {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = undefined;
    }
    originalReadlink.call(fs, path, opts, (error, resolvedPath) => {
      if (error && error.code === 'EISDIR') {
        error.code = 'EINVAL';
        error.errno = -4071;
        error.message = error.message.replace('EISDIR: illegal operation on a directory', 'EINVAL: invalid argument');
      }
      if (cb) cb(error, resolvedPath);
    });
  };

  if (fs.promises && fs.promises.readlink) {
    const originalPromisesReadlink = fs.promises.readlink;
    fs.promises.readlink = function (path, options) {
      return originalPromisesReadlink.call(fs.promises, path, options).catch((error) => {
        if (error && error.code === 'EISDIR') {
          error.code = 'EINVAL';
          error.errno = -4071;
          error.message = error.message.replace('EISDIR: illegal operation on a directory', 'EINVAL: invalid argument');
        }
        throw error;
      });
    };
  }

  const originalReaddir = fs.readdir;
  const originalReaddirSync = fs.readdirSync;

  // Resolve current project root dynamically to support other Windows setups
  const projectRoot = __dirname.toLowerCase().replace(/\//g, '\\');

  function isOutOfBounds(path) {
    if (typeof path !== 'string') return false;
    const normalized = path.toLowerCase().replace(/\//g, '\\');
    return normalized.startsWith('c:\\') || (!normalized.startsWith(projectRoot) && !normalized.startsWith('.'));
  }

  fs.readdirSync = function (path, options) {
    if (isOutOfBounds(path)) {
      return [];
    }
    try {
      return originalReaddirSync.call(fs, path, options);
    } catch (error) {
      if (error && (error.code === 'EPERM' || error.code === 'EACCES')) {
        return [];
      }
      throw error;
    }
  };

  fs.readdir = function (path, options, callback) {
    let cb = callback;
    let opts = options;
    if (typeof options === 'function') {
      cb = options;
      opts = undefined;
    }
    if (isOutOfBounds(path)) {
      if (cb) cb(null, []);
      return;
    }
    originalReaddir.call(fs, path, opts, (error, files) => {
      if (error && (error.code === 'EPERM' || error.code === 'EACCES')) {
        if (cb) cb(null, []);
        return;
      }
      if (cb) cb(error, files);
    });
  };

  if (fs.promises && fs.promises.readdir) {
    const originalPromisesReaddir = fs.promises.readdir;
    fs.promises.readdir = function (path, options) {
      if (isOutOfBounds(path)) {
        return Promise.resolve([]);
      }
      return originalPromisesReaddir.call(fs.promises, path, options).catch((error) => {
        if (error && (error.code === 'EPERM' || error.code === 'EACCES')) {
          return [];
        }
        throw error;
      });
    };
  }
}
