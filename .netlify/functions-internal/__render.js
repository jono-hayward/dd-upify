var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[Object.keys(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[Object.keys(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  __markAsModule(target);
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __reExport = (target, module2, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && key !== "default")
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toModule = (module2) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", module2 && module2.__esModule && "default" in module2 ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};

// node_modules/@sveltejs/kit/dist/install-fetch.js
function dataUriToBuffer(uri) {
  if (!/^data:/i.test(uri)) {
    throw new TypeError('`uri` does not appear to be a Data URI (must begin with "data:")');
  }
  uri = uri.replace(/\r?\n/g, "");
  const firstComma = uri.indexOf(",");
  if (firstComma === -1 || firstComma <= 4) {
    throw new TypeError("malformed data: URI");
  }
  const meta = uri.substring(5, firstComma).split(";");
  let charset = "";
  let base64 = false;
  const type = meta[0] || "text/plain";
  let typeFull = type;
  for (let i = 1; i < meta.length; i++) {
    if (meta[i] === "base64") {
      base64 = true;
    } else {
      typeFull += `;${meta[i]}`;
      if (meta[i].indexOf("charset=") === 0) {
        charset = meta[i].substring(8);
      }
    }
  }
  if (!meta[0] && !charset.length) {
    typeFull += ";charset=US-ASCII";
    charset = "US-ASCII";
  }
  const encoding = base64 ? "base64" : "ascii";
  const data = unescape(uri.substring(firstComma + 1));
  const buffer = Buffer.from(data, encoding);
  buffer.type = type;
  buffer.typeFull = typeFull;
  buffer.charset = charset;
  return buffer;
}
async function* toIterator(parts, clone2 = true) {
  for (let part of parts) {
    if ("stream" in part) {
      yield* part.stream();
    } else if (ArrayBuffer.isView(part)) {
      if (clone2) {
        let position = part.byteOffset;
        let end = part.byteOffset + part.byteLength;
        while (position !== end) {
          const size = Math.min(end - position, POOL_SIZE);
          const chunk = part.buffer.slice(position, position + size);
          position += chunk.byteLength;
          yield new Uint8Array(chunk);
        }
      } else {
        yield part;
      }
    } else {
      let position = 0;
      while (position !== part.size) {
        const chunk = part.slice(position, Math.min(part.size, position + POOL_SIZE));
        const buffer = await chunk.arrayBuffer();
        position += buffer.byteLength;
        yield new Uint8Array(buffer);
      }
    }
  }
}
function isFormData(object) {
  return typeof object === "object" && typeof object.append === "function" && typeof object.set === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.delete === "function" && typeof object.keys === "function" && typeof object.values === "function" && typeof object.entries === "function" && typeof object.constructor === "function" && object[NAME] === "FormData";
}
function getHeader(boundary, name, field) {
  let header = "";
  header += `${dashes}${boundary}${carriage}`;
  header += `Content-Disposition: form-data; name="${name}"`;
  if (isBlob(field)) {
    header += `; filename="${field.name}"${carriage}`;
    header += `Content-Type: ${field.type || "application/octet-stream"}`;
  }
  return `${header}${carriage.repeat(2)}`;
}
async function* formDataIterator(form, boundary) {
  for (const [name, value] of form) {
    yield getHeader(boundary, name, value);
    if (isBlob(value)) {
      yield* value.stream();
    } else {
      yield value;
    }
    yield carriage;
  }
  yield getFooter(boundary);
}
function getFormDataLength(form, boundary) {
  let length = 0;
  for (const [name, value] of form) {
    length += Buffer.byteLength(getHeader(boundary, name, value));
    length += isBlob(value) ? value.size : Buffer.byteLength(String(value));
    length += carriageLength;
  }
  length += Buffer.byteLength(getFooter(boundary));
  return length;
}
async function consumeBody(data) {
  if (data[INTERNALS$2].disturbed) {
    throw new TypeError(`body used already for: ${data.url}`);
  }
  data[INTERNALS$2].disturbed = true;
  if (data[INTERNALS$2].error) {
    throw data[INTERNALS$2].error;
  }
  let { body } = data;
  if (body === null) {
    return Buffer.alloc(0);
  }
  if (isBlob(body)) {
    body = import_stream.default.Readable.from(body.stream());
  }
  if (Buffer.isBuffer(body)) {
    return body;
  }
  if (!(body instanceof import_stream.default)) {
    return Buffer.alloc(0);
  }
  const accum = [];
  let accumBytes = 0;
  try {
    for await (const chunk of body) {
      if (data.size > 0 && accumBytes + chunk.length > data.size) {
        const error2 = new FetchError(`content size at ${data.url} over limit: ${data.size}`, "max-size");
        body.destroy(error2);
        throw error2;
      }
      accumBytes += chunk.length;
      accum.push(chunk);
    }
  } catch (error2) {
    const error_ = error2 instanceof FetchBaseError ? error2 : new FetchError(`Invalid response body while trying to fetch ${data.url}: ${error2.message}`, "system", error2);
    throw error_;
  }
  if (body.readableEnded === true || body._readableState.ended === true) {
    try {
      if (accum.every((c) => typeof c === "string")) {
        return Buffer.from(accum.join(""));
      }
      return Buffer.concat(accum, accumBytes);
    } catch (error2) {
      throw new FetchError(`Could not create Buffer from response body for ${data.url}: ${error2.message}`, "system", error2);
    }
  } else {
    throw new FetchError(`Premature close of server response while trying to fetch ${data.url}`);
  }
}
function fromRawHeaders(headers = []) {
  return new Headers(headers.reduce((result, value, index2, array) => {
    if (index2 % 2 === 0) {
      result.push(array.slice(index2, index2 + 2));
    }
    return result;
  }, []).filter(([name, value]) => {
    try {
      validateHeaderName(name);
      validateHeaderValue(name, String(value));
      return true;
    } catch {
      return false;
    }
  }));
}
async function fetch(url, options_) {
  return new Promise((resolve2, reject) => {
    const request = new Request(url, options_);
    const options3 = getNodeRequestOptions(request);
    if (!supportedSchemas.has(options3.protocol)) {
      throw new TypeError(`node-fetch cannot load ${url}. URL scheme "${options3.protocol.replace(/:$/, "")}" is not supported.`);
    }
    if (options3.protocol === "data:") {
      const data = dataUriToBuffer$1(request.url);
      const response2 = new Response(data, { headers: { "Content-Type": data.typeFull } });
      resolve2(response2);
      return;
    }
    const send = (options3.protocol === "https:" ? import_https.default : import_http.default).request;
    const { signal } = request;
    let response = null;
    const abort = () => {
      const error2 = new AbortError("The operation was aborted.");
      reject(error2);
      if (request.body && request.body instanceof import_stream.default.Readable) {
        request.body.destroy(error2);
      }
      if (!response || !response.body) {
        return;
      }
      response.body.emit("error", error2);
    };
    if (signal && signal.aborted) {
      abort();
      return;
    }
    const abortAndFinalize = () => {
      abort();
      finalize();
    };
    const request_ = send(options3);
    if (signal) {
      signal.addEventListener("abort", abortAndFinalize);
    }
    const finalize = () => {
      request_.abort();
      if (signal) {
        signal.removeEventListener("abort", abortAndFinalize);
      }
    };
    request_.on("error", (error2) => {
      reject(new FetchError(`request to ${request.url} failed, reason: ${error2.message}`, "system", error2));
      finalize();
    });
    fixResponseChunkedTransferBadEnding(request_, (error2) => {
      response.body.destroy(error2);
    });
    if (process.version < "v14") {
      request_.on("socket", (s2) => {
        let endedWithEventsCount;
        s2.prependListener("end", () => {
          endedWithEventsCount = s2._eventsCount;
        });
        s2.prependListener("close", (hadError) => {
          if (response && endedWithEventsCount < s2._eventsCount && !hadError) {
            const error2 = new Error("Premature close");
            error2.code = "ERR_STREAM_PREMATURE_CLOSE";
            response.body.emit("error", error2);
          }
        });
      });
    }
    request_.on("response", (response_) => {
      request_.setTimeout(0);
      const headers = fromRawHeaders(response_.rawHeaders);
      if (isRedirect(response_.statusCode)) {
        const location = headers.get("Location");
        const locationURL = location === null ? null : new URL(location, request.url);
        switch (request.redirect) {
          case "error":
            reject(new FetchError(`uri requested responds with a redirect, redirect mode is set to error: ${request.url}`, "no-redirect"));
            finalize();
            return;
          case "manual":
            if (locationURL !== null) {
              headers.set("Location", locationURL);
            }
            break;
          case "follow": {
            if (locationURL === null) {
              break;
            }
            if (request.counter >= request.follow) {
              reject(new FetchError(`maximum redirect reached at: ${request.url}`, "max-redirect"));
              finalize();
              return;
            }
            const requestOptions = {
              headers: new Headers(request.headers),
              follow: request.follow,
              counter: request.counter + 1,
              agent: request.agent,
              compress: request.compress,
              method: request.method,
              body: request.body,
              signal: request.signal,
              size: request.size
            };
            if (response_.statusCode !== 303 && request.body && options_.body instanceof import_stream.default.Readable) {
              reject(new FetchError("Cannot follow redirect with body being a readable stream", "unsupported-redirect"));
              finalize();
              return;
            }
            if (response_.statusCode === 303 || (response_.statusCode === 301 || response_.statusCode === 302) && request.method === "POST") {
              requestOptions.method = "GET";
              requestOptions.body = void 0;
              requestOptions.headers.delete("content-length");
            }
            resolve2(fetch(new Request(locationURL, requestOptions)));
            finalize();
            return;
          }
          default:
            return reject(new TypeError(`Redirect option '${request.redirect}' is not a valid value of RequestRedirect`));
        }
      }
      if (signal) {
        response_.once("end", () => {
          signal.removeEventListener("abort", abortAndFinalize);
        });
      }
      let body = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
      if (process.version < "v12.10") {
        response_.on("aborted", abortAndFinalize);
      }
      const responseOptions = {
        url: request.url,
        status: response_.statusCode,
        statusText: response_.statusMessage,
        headers,
        size: request.size,
        counter: request.counter,
        highWaterMark: request.highWaterMark
      };
      const codings = headers.get("Content-Encoding");
      if (!request.compress || request.method === "HEAD" || codings === null || response_.statusCode === 204 || response_.statusCode === 304) {
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      const zlibOptions = {
        flush: import_zlib.default.Z_SYNC_FLUSH,
        finishFlush: import_zlib.default.Z_SYNC_FLUSH
      };
      if (codings === "gzip" || codings === "x-gzip") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createGunzip(zlibOptions), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      if (codings === "deflate" || codings === "x-deflate") {
        const raw = (0, import_stream.pipeline)(response_, new import_stream.PassThrough(), reject);
        raw.once("data", (chunk) => {
          body = (chunk[0] & 15) === 8 ? (0, import_stream.pipeline)(body, import_zlib.default.createInflate(), reject) : (0, import_stream.pipeline)(body, import_zlib.default.createInflateRaw(), reject);
          response = new Response(body, responseOptions);
          resolve2(response);
        });
        return;
      }
      if (codings === "br") {
        body = (0, import_stream.pipeline)(body, import_zlib.default.createBrotliDecompress(), reject);
        response = new Response(body, responseOptions);
        resolve2(response);
        return;
      }
      response = new Response(body, responseOptions);
      resolve2(response);
    });
    writeToStream(request_, request);
  });
}
function fixResponseChunkedTransferBadEnding(request, errorCallback) {
  const LAST_CHUNK = Buffer.from("0\r\n\r\n");
  let isChunkedTransfer = false;
  let properLastChunkReceived = false;
  let previousChunk;
  request.on("response", (response) => {
    const { headers } = response;
    isChunkedTransfer = headers["transfer-encoding"] === "chunked" && !headers["content-length"];
  });
  request.on("socket", (socket) => {
    const onSocketClose = () => {
      if (isChunkedTransfer && !properLastChunkReceived) {
        const error2 = new Error("Premature close");
        error2.code = "ERR_STREAM_PREMATURE_CLOSE";
        errorCallback(error2);
      }
    };
    socket.prependListener("close", onSocketClose);
    request.on("abort", () => {
      socket.removeListener("close", onSocketClose);
    });
    socket.on("data", (buf) => {
      properLastChunkReceived = Buffer.compare(buf.slice(-5), LAST_CHUNK) === 0;
      if (!properLastChunkReceived && previousChunk) {
        properLastChunkReceived = Buffer.compare(previousChunk.slice(-3), LAST_CHUNK.slice(0, 3)) === 0 && Buffer.compare(buf.slice(-2), LAST_CHUNK.slice(3)) === 0;
      }
      previousChunk = buf;
    });
  });
}
var import_http, import_https, import_zlib, import_stream, import_util, import_crypto, import_url, commonjsGlobal, src, dataUriToBuffer$1, ponyfill_es2018, POOL_SIZE$1, POOL_SIZE, _Blob, Blob2, Blob$1, FetchBaseError, FetchError, NAME, isURLSearchParameters, isBlob, isAbortSignal, carriage, dashes, carriageLength, getFooter, getBoundary, INTERNALS$2, Body, clone, extractContentType, getTotalBytes, writeToStream, validateHeaderName, validateHeaderValue, Headers, redirectStatus, isRedirect, INTERNALS$1, Response, getSearch, INTERNALS, isRequest, Request, getNodeRequestOptions, AbortError, supportedSchemas;
var init_install_fetch = __esm({
  "node_modules/@sveltejs/kit/dist/install-fetch.js"() {
    init_shims();
    import_http = __toModule(require("http"));
    import_https = __toModule(require("https"));
    import_zlib = __toModule(require("zlib"));
    import_stream = __toModule(require("stream"));
    import_util = __toModule(require("util"));
    import_crypto = __toModule(require("crypto"));
    import_url = __toModule(require("url"));
    commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
    src = dataUriToBuffer;
    dataUriToBuffer$1 = src;
    ponyfill_es2018 = { exports: {} };
    (function(module2, exports2) {
      (function(global2, factory) {
        factory(exports2);
      })(commonjsGlobal, function(exports3) {
        const SymbolPolyfill = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? Symbol : (description) => `Symbol(${description})`;
        function noop2() {
          return void 0;
        }
        function getGlobals() {
          if (typeof self !== "undefined") {
            return self;
          } else if (typeof window !== "undefined") {
            return window;
          } else if (typeof commonjsGlobal !== "undefined") {
            return commonjsGlobal;
          }
          return void 0;
        }
        const globals2 = getGlobals();
        function typeIsObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        const rethrowAssertionErrorRejection = noop2;
        const originalPromise = Promise;
        const originalPromiseThen = Promise.prototype.then;
        const originalPromiseResolve = Promise.resolve.bind(originalPromise);
        const originalPromiseReject = Promise.reject.bind(originalPromise);
        function newPromise(executor) {
          return new originalPromise(executor);
        }
        function promiseResolvedWith(value) {
          return originalPromiseResolve(value);
        }
        function promiseRejectedWith(reason) {
          return originalPromiseReject(reason);
        }
        function PerformPromiseThen(promise, onFulfilled, onRejected) {
          return originalPromiseThen.call(promise, onFulfilled, onRejected);
        }
        function uponPromise(promise, onFulfilled, onRejected) {
          PerformPromiseThen(PerformPromiseThen(promise, onFulfilled, onRejected), void 0, rethrowAssertionErrorRejection);
        }
        function uponFulfillment(promise, onFulfilled) {
          uponPromise(promise, onFulfilled);
        }
        function uponRejection(promise, onRejected) {
          uponPromise(promise, void 0, onRejected);
        }
        function transformPromiseWith(promise, fulfillmentHandler, rejectionHandler) {
          return PerformPromiseThen(promise, fulfillmentHandler, rejectionHandler);
        }
        function setPromiseIsHandledToTrue(promise) {
          PerformPromiseThen(promise, void 0, rethrowAssertionErrorRejection);
        }
        const queueMicrotask = (() => {
          const globalQueueMicrotask = globals2 && globals2.queueMicrotask;
          if (typeof globalQueueMicrotask === "function") {
            return globalQueueMicrotask;
          }
          const resolvedPromise = promiseResolvedWith(void 0);
          return (fn) => PerformPromiseThen(resolvedPromise, fn);
        })();
        function reflectCall(F, V, args) {
          if (typeof F !== "function") {
            throw new TypeError("Argument is not a function");
          }
          return Function.prototype.apply.call(F, V, args);
        }
        function promiseCall(F, V, args) {
          try {
            return promiseResolvedWith(reflectCall(F, V, args));
          } catch (value) {
            return promiseRejectedWith(value);
          }
        }
        const QUEUE_MAX_ARRAY_SIZE = 16384;
        class SimpleQueue {
          constructor() {
            this._cursor = 0;
            this._size = 0;
            this._front = {
              _elements: [],
              _next: void 0
            };
            this._back = this._front;
            this._cursor = 0;
            this._size = 0;
          }
          get length() {
            return this._size;
          }
          push(element) {
            const oldBack = this._back;
            let newBack = oldBack;
            if (oldBack._elements.length === QUEUE_MAX_ARRAY_SIZE - 1) {
              newBack = {
                _elements: [],
                _next: void 0
              };
            }
            oldBack._elements.push(element);
            if (newBack !== oldBack) {
              this._back = newBack;
              oldBack._next = newBack;
            }
            ++this._size;
          }
          shift() {
            const oldFront = this._front;
            let newFront = oldFront;
            const oldCursor = this._cursor;
            let newCursor = oldCursor + 1;
            const elements = oldFront._elements;
            const element = elements[oldCursor];
            if (newCursor === QUEUE_MAX_ARRAY_SIZE) {
              newFront = oldFront._next;
              newCursor = 0;
            }
            --this._size;
            this._cursor = newCursor;
            if (oldFront !== newFront) {
              this._front = newFront;
            }
            elements[oldCursor] = void 0;
            return element;
          }
          forEach(callback) {
            let i = this._cursor;
            let node = this._front;
            let elements = node._elements;
            while (i !== elements.length || node._next !== void 0) {
              if (i === elements.length) {
                node = node._next;
                elements = node._elements;
                i = 0;
                if (elements.length === 0) {
                  break;
                }
              }
              callback(elements[i]);
              ++i;
            }
          }
          peek() {
            const front = this._front;
            const cursor = this._cursor;
            return front._elements[cursor];
          }
        }
        function ReadableStreamReaderGenericInitialize(reader, stream) {
          reader._ownerReadableStream = stream;
          stream._reader = reader;
          if (stream._state === "readable") {
            defaultReaderClosedPromiseInitialize(reader);
          } else if (stream._state === "closed") {
            defaultReaderClosedPromiseInitializeAsResolved(reader);
          } else {
            defaultReaderClosedPromiseInitializeAsRejected(reader, stream._storedError);
          }
        }
        function ReadableStreamReaderGenericCancel(reader, reason) {
          const stream = reader._ownerReadableStream;
          return ReadableStreamCancel(stream, reason);
        }
        function ReadableStreamReaderGenericRelease(reader) {
          if (reader._ownerReadableStream._state === "readable") {
            defaultReaderClosedPromiseReject(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          } else {
            defaultReaderClosedPromiseResetToRejected(reader, new TypeError(`Reader was released and can no longer be used to monitor the stream's closedness`));
          }
          reader._ownerReadableStream._reader = void 0;
          reader._ownerReadableStream = void 0;
        }
        function readerLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released reader");
        }
        function defaultReaderClosedPromiseInitialize(reader) {
          reader._closedPromise = newPromise((resolve2, reject) => {
            reader._closedPromise_resolve = resolve2;
            reader._closedPromise_reject = reject;
          });
        }
        function defaultReaderClosedPromiseInitializeAsRejected(reader, reason) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseReject(reader, reason);
        }
        function defaultReaderClosedPromiseInitializeAsResolved(reader) {
          defaultReaderClosedPromiseInitialize(reader);
          defaultReaderClosedPromiseResolve(reader);
        }
        function defaultReaderClosedPromiseReject(reader, reason) {
          if (reader._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(reader._closedPromise);
          reader._closedPromise_reject(reason);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        function defaultReaderClosedPromiseResetToRejected(reader, reason) {
          defaultReaderClosedPromiseInitializeAsRejected(reader, reason);
        }
        function defaultReaderClosedPromiseResolve(reader) {
          if (reader._closedPromise_resolve === void 0) {
            return;
          }
          reader._closedPromise_resolve(void 0);
          reader._closedPromise_resolve = void 0;
          reader._closedPromise_reject = void 0;
        }
        const AbortSteps = SymbolPolyfill("[[AbortSteps]]");
        const ErrorSteps = SymbolPolyfill("[[ErrorSteps]]");
        const CancelSteps = SymbolPolyfill("[[CancelSteps]]");
        const PullSteps = SymbolPolyfill("[[PullSteps]]");
        const NumberIsFinite = Number.isFinite || function(x) {
          return typeof x === "number" && isFinite(x);
        };
        const MathTrunc = Math.trunc || function(v) {
          return v < 0 ? Math.ceil(v) : Math.floor(v);
        };
        function isDictionary(x) {
          return typeof x === "object" || typeof x === "function";
        }
        function assertDictionary(obj, context) {
          if (obj !== void 0 && !isDictionary(obj)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertFunction(x, context) {
          if (typeof x !== "function") {
            throw new TypeError(`${context} is not a function.`);
          }
        }
        function isObject(x) {
          return typeof x === "object" && x !== null || typeof x === "function";
        }
        function assertObject(x, context) {
          if (!isObject(x)) {
            throw new TypeError(`${context} is not an object.`);
          }
        }
        function assertRequiredArgument(x, position, context) {
          if (x === void 0) {
            throw new TypeError(`Parameter ${position} is required in '${context}'.`);
          }
        }
        function assertRequiredField(x, field, context) {
          if (x === void 0) {
            throw new TypeError(`${field} is required in '${context}'.`);
          }
        }
        function convertUnrestrictedDouble(value) {
          return Number(value);
        }
        function censorNegativeZero(x) {
          return x === 0 ? 0 : x;
        }
        function integerPart(x) {
          return censorNegativeZero(MathTrunc(x));
        }
        function convertUnsignedLongLongWithEnforceRange(value, context) {
          const lowerBound = 0;
          const upperBound = Number.MAX_SAFE_INTEGER;
          let x = Number(value);
          x = censorNegativeZero(x);
          if (!NumberIsFinite(x)) {
            throw new TypeError(`${context} is not a finite number`);
          }
          x = integerPart(x);
          if (x < lowerBound || x > upperBound) {
            throw new TypeError(`${context} is outside the accepted range of ${lowerBound} to ${upperBound}, inclusive`);
          }
          if (!NumberIsFinite(x) || x === 0) {
            return 0;
          }
          return x;
        }
        function assertReadableStream(x, context) {
          if (!IsReadableStream(x)) {
            throw new TypeError(`${context} is not a ReadableStream.`);
          }
        }
        function AcquireReadableStreamDefaultReader(stream) {
          return new ReadableStreamDefaultReader(stream);
        }
        function ReadableStreamAddReadRequest(stream, readRequest) {
          stream._reader._readRequests.push(readRequest);
        }
        function ReadableStreamFulfillReadRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readRequest = reader._readRequests.shift();
          if (done) {
            readRequest._closeSteps();
          } else {
            readRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadRequests(stream) {
          return stream._reader._readRequests.length;
        }
        function ReadableStreamHasDefaultReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamDefaultReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamDefaultReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamDefaultReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read() {
            if (!IsReadableStreamDefaultReader(this)) {
              return promiseRejectedWith(defaultReaderBrandCheckException("read"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: () => resolvePromise({ value: void 0, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamDefaultReaderRead(this, readRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamDefaultReader(this)) {
              throw defaultReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamDefaultReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultReader",
            configurable: true
          });
        }
        function IsReadableStreamDefaultReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readRequests")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultReader;
        }
        function ReadableStreamDefaultReaderRead(reader, readRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "closed") {
            readRequest._closeSteps();
          } else if (stream._state === "errored") {
            readRequest._errorSteps(stream._storedError);
          } else {
            stream._readableStreamController[PullSteps](readRequest);
          }
        }
        function defaultReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamDefaultReader.prototype.${name} can only be used on a ReadableStreamDefaultReader`);
        }
        const AsyncIteratorPrototype = Object.getPrototypeOf(Object.getPrototypeOf(async function* () {
        }).prototype);
        class ReadableStreamAsyncIteratorImpl {
          constructor(reader, preventCancel) {
            this._ongoingPromise = void 0;
            this._isFinished = false;
            this._reader = reader;
            this._preventCancel = preventCancel;
          }
          next() {
            const nextSteps = () => this._nextSteps();
            this._ongoingPromise = this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, nextSteps, nextSteps) : nextSteps();
            return this._ongoingPromise;
          }
          return(value) {
            const returnSteps = () => this._returnSteps(value);
            return this._ongoingPromise ? transformPromiseWith(this._ongoingPromise, returnSteps, returnSteps) : returnSteps();
          }
          _nextSteps() {
            if (this._isFinished) {
              return Promise.resolve({ value: void 0, done: true });
            }
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("iterate"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readRequest = {
              _chunkSteps: (chunk) => {
                this._ongoingPromise = void 0;
                queueMicrotask(() => resolvePromise({ value: chunk, done: false }));
              },
              _closeSteps: () => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                resolvePromise({ value: void 0, done: true });
              },
              _errorSteps: (reason) => {
                this._ongoingPromise = void 0;
                this._isFinished = true;
                ReadableStreamReaderGenericRelease(reader);
                rejectPromise(reason);
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promise;
          }
          _returnSteps(value) {
            if (this._isFinished) {
              return Promise.resolve({ value, done: true });
            }
            this._isFinished = true;
            const reader = this._reader;
            if (reader._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("finish iterating"));
            }
            if (!this._preventCancel) {
              const result = ReadableStreamReaderGenericCancel(reader, value);
              ReadableStreamReaderGenericRelease(reader);
              return transformPromiseWith(result, () => ({ value, done: true }));
            }
            ReadableStreamReaderGenericRelease(reader);
            return promiseResolvedWith({ value, done: true });
          }
        }
        const ReadableStreamAsyncIteratorPrototype = {
          next() {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("next"));
            }
            return this._asyncIteratorImpl.next();
          },
          return(value) {
            if (!IsReadableStreamAsyncIterator(this)) {
              return promiseRejectedWith(streamAsyncIteratorBrandCheckException("return"));
            }
            return this._asyncIteratorImpl.return(value);
          }
        };
        if (AsyncIteratorPrototype !== void 0) {
          Object.setPrototypeOf(ReadableStreamAsyncIteratorPrototype, AsyncIteratorPrototype);
        }
        function AcquireReadableStreamAsyncIterator(stream, preventCancel) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          const impl = new ReadableStreamAsyncIteratorImpl(reader, preventCancel);
          const iterator = Object.create(ReadableStreamAsyncIteratorPrototype);
          iterator._asyncIteratorImpl = impl;
          return iterator;
        }
        function IsReadableStreamAsyncIterator(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_asyncIteratorImpl")) {
            return false;
          }
          try {
            return x._asyncIteratorImpl instanceof ReadableStreamAsyncIteratorImpl;
          } catch (_a) {
            return false;
          }
        }
        function streamAsyncIteratorBrandCheckException(name) {
          return new TypeError(`ReadableStreamAsyncIterator.${name} can only be used on a ReadableSteamAsyncIterator`);
        }
        const NumberIsNaN = Number.isNaN || function(x) {
          return x !== x;
        };
        function CreateArrayFromList(elements) {
          return elements.slice();
        }
        function CopyDataBlockBytes(dest, destOffset, src2, srcOffset, n) {
          new Uint8Array(dest).set(new Uint8Array(src2, srcOffset, n), destOffset);
        }
        function TransferArrayBuffer(O) {
          return O;
        }
        function IsDetachedBuffer(O) {
          return false;
        }
        function ArrayBufferSlice(buffer, begin, end) {
          if (buffer.slice) {
            return buffer.slice(begin, end);
          }
          const length = end - begin;
          const slice = new ArrayBuffer(length);
          CopyDataBlockBytes(slice, 0, buffer, begin, length);
          return slice;
        }
        function IsNonNegativeNumber(v) {
          if (typeof v !== "number") {
            return false;
          }
          if (NumberIsNaN(v)) {
            return false;
          }
          if (v < 0) {
            return false;
          }
          return true;
        }
        function CloneAsUint8Array(O) {
          const buffer = ArrayBufferSlice(O.buffer, O.byteOffset, O.byteOffset + O.byteLength);
          return new Uint8Array(buffer);
        }
        function DequeueValue(container) {
          const pair = container._queue.shift();
          container._queueTotalSize -= pair.size;
          if (container._queueTotalSize < 0) {
            container._queueTotalSize = 0;
          }
          return pair.value;
        }
        function EnqueueValueWithSize(container, value, size) {
          if (!IsNonNegativeNumber(size) || size === Infinity) {
            throw new RangeError("Size must be a finite, non-NaN, non-negative number.");
          }
          container._queue.push({ value, size });
          container._queueTotalSize += size;
        }
        function PeekQueueValue(container) {
          const pair = container._queue.peek();
          return pair.value;
        }
        function ResetQueue(container) {
          container._queue = new SimpleQueue();
          container._queueTotalSize = 0;
        }
        class ReadableStreamBYOBRequest {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get view() {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("view");
            }
            return this._view;
          }
          respond(bytesWritten) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respond");
            }
            assertRequiredArgument(bytesWritten, 1, "respond");
            bytesWritten = convertUnsignedLongLongWithEnforceRange(bytesWritten, "First parameter");
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(this._view.buffer))
              ;
            ReadableByteStreamControllerRespond(this._associatedReadableByteStreamController, bytesWritten);
          }
          respondWithNewView(view) {
            if (!IsReadableStreamBYOBRequest(this)) {
              throw byobRequestBrandCheckException("respondWithNewView");
            }
            assertRequiredArgument(view, 1, "respondWithNewView");
            if (!ArrayBuffer.isView(view)) {
              throw new TypeError("You can only respond with array buffer views");
            }
            if (this._associatedReadableByteStreamController === void 0) {
              throw new TypeError("This BYOB request has been invalidated");
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            ReadableByteStreamControllerRespondWithNewView(this._associatedReadableByteStreamController, view);
          }
        }
        Object.defineProperties(ReadableStreamBYOBRequest.prototype, {
          respond: { enumerable: true },
          respondWithNewView: { enumerable: true },
          view: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBRequest.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBRequest",
            configurable: true
          });
        }
        class ReadableByteStreamController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get byobRequest() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("byobRequest");
            }
            return ReadableByteStreamControllerGetBYOBRequest(this);
          }
          get desiredSize() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("desiredSize");
            }
            return ReadableByteStreamControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("close");
            }
            if (this._closeRequested) {
              throw new TypeError("The stream has already been closed; do not close it again!");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be closed`);
            }
            ReadableByteStreamControllerClose(this);
          }
          enqueue(chunk) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("enqueue");
            }
            assertRequiredArgument(chunk, 1, "enqueue");
            if (!ArrayBuffer.isView(chunk)) {
              throw new TypeError("chunk must be an array buffer view");
            }
            if (chunk.byteLength === 0) {
              throw new TypeError("chunk must have non-zero byteLength");
            }
            if (chunk.buffer.byteLength === 0) {
              throw new TypeError(`chunk's buffer must have non-zero byteLength`);
            }
            if (this._closeRequested) {
              throw new TypeError("stream is closed or draining");
            }
            const state = this._controlledReadableByteStream._state;
            if (state !== "readable") {
              throw new TypeError(`The stream (in ${state} state) is not in the readable state and cannot be enqueued to`);
            }
            ReadableByteStreamControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableByteStreamController(this)) {
              throw byteStreamControllerBrandCheckException("error");
            }
            ReadableByteStreamControllerError(this, e);
          }
          [CancelSteps](reason) {
            ReadableByteStreamControllerClearPendingPullIntos(this);
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableByteStreamControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableByteStream;
            if (this._queueTotalSize > 0) {
              const entry = this._queue.shift();
              this._queueTotalSize -= entry.byteLength;
              ReadableByteStreamControllerHandleQueueDrain(this);
              const view = new Uint8Array(entry.buffer, entry.byteOffset, entry.byteLength);
              readRequest._chunkSteps(view);
              return;
            }
            const autoAllocateChunkSize = this._autoAllocateChunkSize;
            if (autoAllocateChunkSize !== void 0) {
              let buffer;
              try {
                buffer = new ArrayBuffer(autoAllocateChunkSize);
              } catch (bufferE) {
                readRequest._errorSteps(bufferE);
                return;
              }
              const pullIntoDescriptor = {
                buffer,
                bufferByteLength: autoAllocateChunkSize,
                byteOffset: 0,
                byteLength: autoAllocateChunkSize,
                bytesFilled: 0,
                elementSize: 1,
                viewConstructor: Uint8Array,
                readerType: "default"
              };
              this._pendingPullIntos.push(pullIntoDescriptor);
            }
            ReadableStreamAddReadRequest(stream, readRequest);
            ReadableByteStreamControllerCallPullIfNeeded(this);
          }
        }
        Object.defineProperties(ReadableByteStreamController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          byobRequest: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableByteStreamController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableByteStreamController",
            configurable: true
          });
        }
        function IsReadableByteStreamController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableByteStream")) {
            return false;
          }
          return x instanceof ReadableByteStreamController;
        }
        function IsReadableStreamBYOBRequest(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_associatedReadableByteStreamController")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBRequest;
        }
        function ReadableByteStreamControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableByteStreamControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableByteStreamControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableByteStreamControllerError(controller, e);
          });
        }
        function ReadableByteStreamControllerClearPendingPullIntos(controller) {
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          controller._pendingPullIntos = new SimpleQueue();
        }
        function ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor) {
          let done = false;
          if (stream._state === "closed") {
            done = true;
          }
          const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
          if (pullIntoDescriptor.readerType === "default") {
            ReadableStreamFulfillReadRequest(stream, filledView, done);
          } else {
            ReadableStreamFulfillReadIntoRequest(stream, filledView, done);
          }
        }
        function ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor) {
          const bytesFilled = pullIntoDescriptor.bytesFilled;
          const elementSize = pullIntoDescriptor.elementSize;
          return new pullIntoDescriptor.viewConstructor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, bytesFilled / elementSize);
        }
        function ReadableByteStreamControllerEnqueueChunkToQueue(controller, buffer, byteOffset, byteLength) {
          controller._queue.push({ buffer, byteOffset, byteLength });
          controller._queueTotalSize += byteLength;
        }
        function ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor) {
          const elementSize = pullIntoDescriptor.elementSize;
          const currentAlignedBytes = pullIntoDescriptor.bytesFilled - pullIntoDescriptor.bytesFilled % elementSize;
          const maxBytesToCopy = Math.min(controller._queueTotalSize, pullIntoDescriptor.byteLength - pullIntoDescriptor.bytesFilled);
          const maxBytesFilled = pullIntoDescriptor.bytesFilled + maxBytesToCopy;
          const maxAlignedBytes = maxBytesFilled - maxBytesFilled % elementSize;
          let totalBytesToCopyRemaining = maxBytesToCopy;
          let ready = false;
          if (maxAlignedBytes > currentAlignedBytes) {
            totalBytesToCopyRemaining = maxAlignedBytes - pullIntoDescriptor.bytesFilled;
            ready = true;
          }
          const queue = controller._queue;
          while (totalBytesToCopyRemaining > 0) {
            const headOfQueue = queue.peek();
            const bytesToCopy = Math.min(totalBytesToCopyRemaining, headOfQueue.byteLength);
            const destStart = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            CopyDataBlockBytes(pullIntoDescriptor.buffer, destStart, headOfQueue.buffer, headOfQueue.byteOffset, bytesToCopy);
            if (headOfQueue.byteLength === bytesToCopy) {
              queue.shift();
            } else {
              headOfQueue.byteOffset += bytesToCopy;
              headOfQueue.byteLength -= bytesToCopy;
            }
            controller._queueTotalSize -= bytesToCopy;
            ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesToCopy, pullIntoDescriptor);
            totalBytesToCopyRemaining -= bytesToCopy;
          }
          return ready;
        }
        function ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, size, pullIntoDescriptor) {
          pullIntoDescriptor.bytesFilled += size;
        }
        function ReadableByteStreamControllerHandleQueueDrain(controller) {
          if (controller._queueTotalSize === 0 && controller._closeRequested) {
            ReadableByteStreamControllerClearAlgorithms(controller);
            ReadableStreamClose(controller._controlledReadableByteStream);
          } else {
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }
        }
        function ReadableByteStreamControllerInvalidateBYOBRequest(controller) {
          if (controller._byobRequest === null) {
            return;
          }
          controller._byobRequest._associatedReadableByteStreamController = void 0;
          controller._byobRequest._view = null;
          controller._byobRequest = null;
        }
        function ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller) {
          while (controller._pendingPullIntos.length > 0) {
            if (controller._queueTotalSize === 0) {
              return;
            }
            const pullIntoDescriptor = controller._pendingPullIntos.peek();
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerPullInto(controller, view, readIntoRequest) {
          const stream = controller._controlledReadableByteStream;
          let elementSize = 1;
          if (view.constructor !== DataView) {
            elementSize = view.constructor.BYTES_PER_ELEMENT;
          }
          const ctor = view.constructor;
          const buffer = TransferArrayBuffer(view.buffer);
          const pullIntoDescriptor = {
            buffer,
            bufferByteLength: buffer.byteLength,
            byteOffset: view.byteOffset,
            byteLength: view.byteLength,
            bytesFilled: 0,
            elementSize,
            viewConstructor: ctor,
            readerType: "byob"
          };
          if (controller._pendingPullIntos.length > 0) {
            controller._pendingPullIntos.push(pullIntoDescriptor);
            ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
            return;
          }
          if (stream._state === "closed") {
            const emptyView = new ctor(pullIntoDescriptor.buffer, pullIntoDescriptor.byteOffset, 0);
            readIntoRequest._closeSteps(emptyView);
            return;
          }
          if (controller._queueTotalSize > 0) {
            if (ReadableByteStreamControllerFillPullIntoDescriptorFromQueue(controller, pullIntoDescriptor)) {
              const filledView = ReadableByteStreamControllerConvertPullIntoDescriptor(pullIntoDescriptor);
              ReadableByteStreamControllerHandleQueueDrain(controller);
              readIntoRequest._chunkSteps(filledView);
              return;
            }
            if (controller._closeRequested) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              readIntoRequest._errorSteps(e);
              return;
            }
          }
          controller._pendingPullIntos.push(pullIntoDescriptor);
          ReadableStreamAddReadIntoRequest(stream, readIntoRequest);
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerRespondInClosedState(controller, firstDescriptor) {
          const stream = controller._controlledReadableByteStream;
          if (ReadableStreamHasBYOBReader(stream)) {
            while (ReadableStreamGetNumReadIntoRequests(stream) > 0) {
              const pullIntoDescriptor = ReadableByteStreamControllerShiftPendingPullInto(controller);
              ReadableByteStreamControllerCommitPullIntoDescriptor(stream, pullIntoDescriptor);
            }
          }
        }
        function ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, pullIntoDescriptor) {
          ReadableByteStreamControllerFillHeadPullIntoDescriptor(controller, bytesWritten, pullIntoDescriptor);
          if (pullIntoDescriptor.bytesFilled < pullIntoDescriptor.elementSize) {
            return;
          }
          ReadableByteStreamControllerShiftPendingPullInto(controller);
          const remainderSize = pullIntoDescriptor.bytesFilled % pullIntoDescriptor.elementSize;
          if (remainderSize > 0) {
            const end = pullIntoDescriptor.byteOffset + pullIntoDescriptor.bytesFilled;
            const remainder = ArrayBufferSlice(pullIntoDescriptor.buffer, end - remainderSize, end);
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, remainder, 0, remainder.byteLength);
          }
          pullIntoDescriptor.bytesFilled -= remainderSize;
          ReadableByteStreamControllerCommitPullIntoDescriptor(controller._controlledReadableByteStream, pullIntoDescriptor);
          ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
        }
        function ReadableByteStreamControllerRespondInternal(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            ReadableByteStreamControllerRespondInClosedState(controller);
          } else {
            ReadableByteStreamControllerRespondInReadableState(controller, bytesWritten, firstDescriptor);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerShiftPendingPullInto(controller) {
          const descriptor = controller._pendingPullIntos.shift();
          return descriptor;
        }
        function ReadableByteStreamControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return false;
          }
          if (controller._closeRequested) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (ReadableStreamHasDefaultReader(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          if (ReadableStreamHasBYOBReader(stream) && ReadableStreamGetNumReadIntoRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableByteStreamControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableByteStreamControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
        }
        function ReadableByteStreamControllerClose(controller) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          if (controller._queueTotalSize > 0) {
            controller._closeRequested = true;
            return;
          }
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (firstPendingPullInto.bytesFilled > 0) {
              const e = new TypeError("Insufficient bytes to fill elements in the given buffer");
              ReadableByteStreamControllerError(controller, e);
              throw e;
            }
          }
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamClose(stream);
        }
        function ReadableByteStreamControllerEnqueue(controller, chunk) {
          const stream = controller._controlledReadableByteStream;
          if (controller._closeRequested || stream._state !== "readable") {
            return;
          }
          const buffer = chunk.buffer;
          const byteOffset = chunk.byteOffset;
          const byteLength = chunk.byteLength;
          const transferredBuffer = TransferArrayBuffer(buffer);
          if (controller._pendingPullIntos.length > 0) {
            const firstPendingPullInto = controller._pendingPullIntos.peek();
            if (IsDetachedBuffer(firstPendingPullInto.buffer))
              ;
            firstPendingPullInto.buffer = TransferArrayBuffer(firstPendingPullInto.buffer);
          }
          ReadableByteStreamControllerInvalidateBYOBRequest(controller);
          if (ReadableStreamHasDefaultReader(stream)) {
            if (ReadableStreamGetNumReadRequests(stream) === 0) {
              ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            } else {
              const transferredView = new Uint8Array(transferredBuffer, byteOffset, byteLength);
              ReadableStreamFulfillReadRequest(stream, transferredView, false);
            }
          } else if (ReadableStreamHasBYOBReader(stream)) {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
            ReadableByteStreamControllerProcessPullIntoDescriptorsUsingQueue(controller);
          } else {
            ReadableByteStreamControllerEnqueueChunkToQueue(controller, transferredBuffer, byteOffset, byteLength);
          }
          ReadableByteStreamControllerCallPullIfNeeded(controller);
        }
        function ReadableByteStreamControllerError(controller, e) {
          const stream = controller._controlledReadableByteStream;
          if (stream._state !== "readable") {
            return;
          }
          ReadableByteStreamControllerClearPendingPullIntos(controller);
          ResetQueue(controller);
          ReadableByteStreamControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableByteStreamControllerGetBYOBRequest(controller) {
          if (controller._byobRequest === null && controller._pendingPullIntos.length > 0) {
            const firstDescriptor = controller._pendingPullIntos.peek();
            const view = new Uint8Array(firstDescriptor.buffer, firstDescriptor.byteOffset + firstDescriptor.bytesFilled, firstDescriptor.byteLength - firstDescriptor.bytesFilled);
            const byobRequest = Object.create(ReadableStreamBYOBRequest.prototype);
            SetUpReadableStreamBYOBRequest(byobRequest, controller, view);
            controller._byobRequest = byobRequest;
          }
          return controller._byobRequest;
        }
        function ReadableByteStreamControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableByteStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableByteStreamControllerRespond(controller, bytesWritten) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (bytesWritten !== 0) {
              throw new TypeError("bytesWritten must be 0 when calling respond() on a closed stream");
            }
          } else {
            if (bytesWritten === 0) {
              throw new TypeError("bytesWritten must be greater than 0 when calling respond() on a readable stream");
            }
            if (firstDescriptor.bytesFilled + bytesWritten > firstDescriptor.byteLength) {
              throw new RangeError("bytesWritten out of range");
            }
          }
          firstDescriptor.buffer = TransferArrayBuffer(firstDescriptor.buffer);
          ReadableByteStreamControllerRespondInternal(controller, bytesWritten);
        }
        function ReadableByteStreamControllerRespondWithNewView(controller, view) {
          const firstDescriptor = controller._pendingPullIntos.peek();
          const state = controller._controlledReadableByteStream._state;
          if (state === "closed") {
            if (view.byteLength !== 0) {
              throw new TypeError("The view's length must be 0 when calling respondWithNewView() on a closed stream");
            }
          } else {
            if (view.byteLength === 0) {
              throw new TypeError("The view's length must be greater than 0 when calling respondWithNewView() on a readable stream");
            }
          }
          if (firstDescriptor.byteOffset + firstDescriptor.bytesFilled !== view.byteOffset) {
            throw new RangeError("The region specified by view does not match byobRequest");
          }
          if (firstDescriptor.bufferByteLength !== view.buffer.byteLength) {
            throw new RangeError("The buffer of view has different capacity than byobRequest");
          }
          if (firstDescriptor.bytesFilled + view.byteLength > firstDescriptor.byteLength) {
            throw new RangeError("The region specified by view is larger than byobRequest");
          }
          firstDescriptor.buffer = TransferArrayBuffer(view.buffer);
          ReadableByteStreamControllerRespondInternal(controller, view.byteLength);
        }
        function SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize) {
          controller._controlledReadableByteStream = stream;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._byobRequest = null;
          controller._queue = controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._closeRequested = false;
          controller._started = false;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          controller._autoAllocateChunkSize = autoAllocateChunkSize;
          controller._pendingPullIntos = new SimpleQueue();
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableByteStreamControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableByteStreamControllerError(controller, r);
          });
        }
        function SetUpReadableByteStreamControllerFromUnderlyingSource(stream, underlyingByteSource, highWaterMark) {
          const controller = Object.create(ReadableByteStreamController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingByteSource.start !== void 0) {
            startAlgorithm = () => underlyingByteSource.start(controller);
          }
          if (underlyingByteSource.pull !== void 0) {
            pullAlgorithm = () => underlyingByteSource.pull(controller);
          }
          if (underlyingByteSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingByteSource.cancel(reason);
          }
          const autoAllocateChunkSize = underlyingByteSource.autoAllocateChunkSize;
          if (autoAllocateChunkSize === 0) {
            throw new TypeError("autoAllocateChunkSize must be greater than 0");
          }
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, autoAllocateChunkSize);
        }
        function SetUpReadableStreamBYOBRequest(request, controller, view) {
          request._associatedReadableByteStreamController = controller;
          request._view = view;
        }
        function byobRequestBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBRequest.prototype.${name} can only be used on a ReadableStreamBYOBRequest`);
        }
        function byteStreamControllerBrandCheckException(name) {
          return new TypeError(`ReadableByteStreamController.prototype.${name} can only be used on a ReadableByteStreamController`);
        }
        function AcquireReadableStreamBYOBReader(stream) {
          return new ReadableStreamBYOBReader(stream);
        }
        function ReadableStreamAddReadIntoRequest(stream, readIntoRequest) {
          stream._reader._readIntoRequests.push(readIntoRequest);
        }
        function ReadableStreamFulfillReadIntoRequest(stream, chunk, done) {
          const reader = stream._reader;
          const readIntoRequest = reader._readIntoRequests.shift();
          if (done) {
            readIntoRequest._closeSteps(chunk);
          } else {
            readIntoRequest._chunkSteps(chunk);
          }
        }
        function ReadableStreamGetNumReadIntoRequests(stream) {
          return stream._reader._readIntoRequests.length;
        }
        function ReadableStreamHasBYOBReader(stream) {
          const reader = stream._reader;
          if (reader === void 0) {
            return false;
          }
          if (!IsReadableStreamBYOBReader(reader)) {
            return false;
          }
          return true;
        }
        class ReadableStreamBYOBReader {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "ReadableStreamBYOBReader");
            assertReadableStream(stream, "First parameter");
            if (IsReadableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive reading by another reader");
            }
            if (!IsReadableByteStreamController(stream._readableStreamController)) {
              throw new TypeError("Cannot construct a ReadableStreamBYOBReader for a stream not constructed with a byte source");
            }
            ReadableStreamReaderGenericInitialize(this, stream);
            this._readIntoRequests = new SimpleQueue();
          }
          get closed() {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          cancel(reason = void 0) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("cancel"));
            }
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("cancel"));
            }
            return ReadableStreamReaderGenericCancel(this, reason);
          }
          read(view) {
            if (!IsReadableStreamBYOBReader(this)) {
              return promiseRejectedWith(byobReaderBrandCheckException("read"));
            }
            if (!ArrayBuffer.isView(view)) {
              return promiseRejectedWith(new TypeError("view must be an array buffer view"));
            }
            if (view.byteLength === 0) {
              return promiseRejectedWith(new TypeError("view must have non-zero byteLength"));
            }
            if (view.buffer.byteLength === 0) {
              return promiseRejectedWith(new TypeError(`view's buffer must have non-zero byteLength`));
            }
            if (IsDetachedBuffer(view.buffer))
              ;
            if (this._ownerReadableStream === void 0) {
              return promiseRejectedWith(readerLockException("read from"));
            }
            let resolvePromise;
            let rejectPromise;
            const promise = newPromise((resolve2, reject) => {
              resolvePromise = resolve2;
              rejectPromise = reject;
            });
            const readIntoRequest = {
              _chunkSteps: (chunk) => resolvePromise({ value: chunk, done: false }),
              _closeSteps: (chunk) => resolvePromise({ value: chunk, done: true }),
              _errorSteps: (e) => rejectPromise(e)
            };
            ReadableStreamBYOBReaderRead(this, view, readIntoRequest);
            return promise;
          }
          releaseLock() {
            if (!IsReadableStreamBYOBReader(this)) {
              throw byobReaderBrandCheckException("releaseLock");
            }
            if (this._ownerReadableStream === void 0) {
              return;
            }
            if (this._readIntoRequests.length > 0) {
              throw new TypeError("Tried to release a reader lock when that reader has pending read() calls un-settled");
            }
            ReadableStreamReaderGenericRelease(this);
          }
        }
        Object.defineProperties(ReadableStreamBYOBReader.prototype, {
          cancel: { enumerable: true },
          read: { enumerable: true },
          releaseLock: { enumerable: true },
          closed: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamBYOBReader.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamBYOBReader",
            configurable: true
          });
        }
        function IsReadableStreamBYOBReader(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readIntoRequests")) {
            return false;
          }
          return x instanceof ReadableStreamBYOBReader;
        }
        function ReadableStreamBYOBReaderRead(reader, view, readIntoRequest) {
          const stream = reader._ownerReadableStream;
          stream._disturbed = true;
          if (stream._state === "errored") {
            readIntoRequest._errorSteps(stream._storedError);
          } else {
            ReadableByteStreamControllerPullInto(stream._readableStreamController, view, readIntoRequest);
          }
        }
        function byobReaderBrandCheckException(name) {
          return new TypeError(`ReadableStreamBYOBReader.prototype.${name} can only be used on a ReadableStreamBYOBReader`);
        }
        function ExtractHighWaterMark(strategy, defaultHWM) {
          const { highWaterMark } = strategy;
          if (highWaterMark === void 0) {
            return defaultHWM;
          }
          if (NumberIsNaN(highWaterMark) || highWaterMark < 0) {
            throw new RangeError("Invalid highWaterMark");
          }
          return highWaterMark;
        }
        function ExtractSizeAlgorithm(strategy) {
          const { size } = strategy;
          if (!size) {
            return () => 1;
          }
          return size;
        }
        function convertQueuingStrategy(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          const size = init2 === null || init2 === void 0 ? void 0 : init2.size;
          return {
            highWaterMark: highWaterMark === void 0 ? void 0 : convertUnrestrictedDouble(highWaterMark),
            size: size === void 0 ? void 0 : convertQueuingStrategySize(size, `${context} has member 'size' that`)
          };
        }
        function convertQueuingStrategySize(fn, context) {
          assertFunction(fn, context);
          return (chunk) => convertUnrestrictedDouble(fn(chunk));
        }
        function convertUnderlyingSink(original, context) {
          assertDictionary(original, context);
          const abort = original === null || original === void 0 ? void 0 : original.abort;
          const close = original === null || original === void 0 ? void 0 : original.close;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          const write = original === null || original === void 0 ? void 0 : original.write;
          return {
            abort: abort === void 0 ? void 0 : convertUnderlyingSinkAbortCallback(abort, original, `${context} has member 'abort' that`),
            close: close === void 0 ? void 0 : convertUnderlyingSinkCloseCallback(close, original, `${context} has member 'close' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSinkStartCallback(start, original, `${context} has member 'start' that`),
            write: write === void 0 ? void 0 : convertUnderlyingSinkWriteCallback(write, original, `${context} has member 'write' that`),
            type
          };
        }
        function convertUnderlyingSinkAbortCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSinkCloseCallback(fn, original, context) {
          assertFunction(fn, context);
          return () => promiseCall(fn, original, []);
        }
        function convertUnderlyingSinkStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertUnderlyingSinkWriteCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        function assertWritableStream(x, context) {
          if (!IsWritableStream(x)) {
            throw new TypeError(`${context} is not a WritableStream.`);
          }
        }
        function isAbortSignal2(value) {
          if (typeof value !== "object" || value === null) {
            return false;
          }
          try {
            return typeof value.aborted === "boolean";
          } catch (_a) {
            return false;
          }
        }
        const supportsAbortController = typeof AbortController === "function";
        function createAbortController() {
          if (supportsAbortController) {
            return new AbortController();
          }
          return void 0;
        }
        class WritableStream {
          constructor(rawUnderlyingSink = {}, rawStrategy = {}) {
            if (rawUnderlyingSink === void 0) {
              rawUnderlyingSink = null;
            } else {
              assertObject(rawUnderlyingSink, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSink = convertUnderlyingSink(rawUnderlyingSink, "First parameter");
            InitializeWritableStream(this);
            const type = underlyingSink.type;
            if (type !== void 0) {
              throw new RangeError("Invalid type is specified");
            }
            const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
            const highWaterMark = ExtractHighWaterMark(strategy, 1);
            SetUpWritableStreamDefaultControllerFromUnderlyingSink(this, underlyingSink, highWaterMark, sizeAlgorithm);
          }
          get locked() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("locked");
            }
            return IsWritableStreamLocked(this);
          }
          abort(reason = void 0) {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("abort"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot abort a stream that already has a writer"));
            }
            return WritableStreamAbort(this, reason);
          }
          close() {
            if (!IsWritableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$2("close"));
            }
            if (IsWritableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot close a stream that already has a writer"));
            }
            if (WritableStreamCloseQueuedOrInFlight(this)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamClose(this);
          }
          getWriter() {
            if (!IsWritableStream(this)) {
              throw streamBrandCheckException$2("getWriter");
            }
            return AcquireWritableStreamDefaultWriter(this);
          }
        }
        Object.defineProperties(WritableStream.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          getWriter: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStream.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStream",
            configurable: true
          });
        }
        function AcquireWritableStreamDefaultWriter(stream) {
          return new WritableStreamDefaultWriter(stream);
        }
        function CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(WritableStream.prototype);
          InitializeWritableStream(stream);
          const controller = Object.create(WritableStreamDefaultController.prototype);
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function InitializeWritableStream(stream) {
          stream._state = "writable";
          stream._storedError = void 0;
          stream._writer = void 0;
          stream._writableStreamController = void 0;
          stream._writeRequests = new SimpleQueue();
          stream._inFlightWriteRequest = void 0;
          stream._closeRequest = void 0;
          stream._inFlightCloseRequest = void 0;
          stream._pendingAbortRequest = void 0;
          stream._backpressure = false;
        }
        function IsWritableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_writableStreamController")) {
            return false;
          }
          return x instanceof WritableStream;
        }
        function IsWritableStreamLocked(stream) {
          if (stream._writer === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamAbort(stream, reason) {
          var _a;
          if (stream._state === "closed" || stream._state === "errored") {
            return promiseResolvedWith(void 0);
          }
          stream._writableStreamController._abortReason = reason;
          (_a = stream._writableStreamController._abortController) === null || _a === void 0 ? void 0 : _a.abort();
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseResolvedWith(void 0);
          }
          if (stream._pendingAbortRequest !== void 0) {
            return stream._pendingAbortRequest._promise;
          }
          let wasAlreadyErroring = false;
          if (state === "erroring") {
            wasAlreadyErroring = true;
            reason = void 0;
          }
          const promise = newPromise((resolve2, reject) => {
            stream._pendingAbortRequest = {
              _promise: void 0,
              _resolve: resolve2,
              _reject: reject,
              _reason: reason,
              _wasAlreadyErroring: wasAlreadyErroring
            };
          });
          stream._pendingAbortRequest._promise = promise;
          if (!wasAlreadyErroring) {
            WritableStreamStartErroring(stream, reason);
          }
          return promise;
        }
        function WritableStreamClose(stream) {
          const state = stream._state;
          if (state === "closed" || state === "errored") {
            return promiseRejectedWith(new TypeError(`The stream (in ${state} state) is not in the writable state and cannot be closed`));
          }
          const promise = newPromise((resolve2, reject) => {
            const closeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._closeRequest = closeRequest;
          });
          const writer = stream._writer;
          if (writer !== void 0 && stream._backpressure && state === "writable") {
            defaultWriterReadyPromiseResolve(writer);
          }
          WritableStreamDefaultControllerClose(stream._writableStreamController);
          return promise;
        }
        function WritableStreamAddWriteRequest(stream) {
          const promise = newPromise((resolve2, reject) => {
            const writeRequest = {
              _resolve: resolve2,
              _reject: reject
            };
            stream._writeRequests.push(writeRequest);
          });
          return promise;
        }
        function WritableStreamDealWithRejection(stream, error2) {
          const state = stream._state;
          if (state === "writable") {
            WritableStreamStartErroring(stream, error2);
            return;
          }
          WritableStreamFinishErroring(stream);
        }
        function WritableStreamStartErroring(stream, reason) {
          const controller = stream._writableStreamController;
          stream._state = "erroring";
          stream._storedError = reason;
          const writer = stream._writer;
          if (writer !== void 0) {
            WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, reason);
          }
          if (!WritableStreamHasOperationMarkedInFlight(stream) && controller._started) {
            WritableStreamFinishErroring(stream);
          }
        }
        function WritableStreamFinishErroring(stream) {
          stream._state = "errored";
          stream._writableStreamController[ErrorSteps]();
          const storedError = stream._storedError;
          stream._writeRequests.forEach((writeRequest) => {
            writeRequest._reject(storedError);
          });
          stream._writeRequests = new SimpleQueue();
          if (stream._pendingAbortRequest === void 0) {
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const abortRequest = stream._pendingAbortRequest;
          stream._pendingAbortRequest = void 0;
          if (abortRequest._wasAlreadyErroring) {
            abortRequest._reject(storedError);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
            return;
          }
          const promise = stream._writableStreamController[AbortSteps](abortRequest._reason);
          uponPromise(promise, () => {
            abortRequest._resolve();
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          }, (reason) => {
            abortRequest._reject(reason);
            WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream);
          });
        }
        function WritableStreamFinishInFlightWrite(stream) {
          stream._inFlightWriteRequest._resolve(void 0);
          stream._inFlightWriteRequest = void 0;
        }
        function WritableStreamFinishInFlightWriteWithError(stream, error2) {
          stream._inFlightWriteRequest._reject(error2);
          stream._inFlightWriteRequest = void 0;
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamFinishInFlightClose(stream) {
          stream._inFlightCloseRequest._resolve(void 0);
          stream._inFlightCloseRequest = void 0;
          const state = stream._state;
          if (state === "erroring") {
            stream._storedError = void 0;
            if (stream._pendingAbortRequest !== void 0) {
              stream._pendingAbortRequest._resolve();
              stream._pendingAbortRequest = void 0;
            }
          }
          stream._state = "closed";
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseResolve(writer);
          }
        }
        function WritableStreamFinishInFlightCloseWithError(stream, error2) {
          stream._inFlightCloseRequest._reject(error2);
          stream._inFlightCloseRequest = void 0;
          if (stream._pendingAbortRequest !== void 0) {
            stream._pendingAbortRequest._reject(error2);
            stream._pendingAbortRequest = void 0;
          }
          WritableStreamDealWithRejection(stream, error2);
        }
        function WritableStreamCloseQueuedOrInFlight(stream) {
          if (stream._closeRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamHasOperationMarkedInFlight(stream) {
          if (stream._inFlightWriteRequest === void 0 && stream._inFlightCloseRequest === void 0) {
            return false;
          }
          return true;
        }
        function WritableStreamMarkCloseRequestInFlight(stream) {
          stream._inFlightCloseRequest = stream._closeRequest;
          stream._closeRequest = void 0;
        }
        function WritableStreamMarkFirstWriteRequestInFlight(stream) {
          stream._inFlightWriteRequest = stream._writeRequests.shift();
        }
        function WritableStreamRejectCloseAndClosedPromiseIfNeeded(stream) {
          if (stream._closeRequest !== void 0) {
            stream._closeRequest._reject(stream._storedError);
            stream._closeRequest = void 0;
          }
          const writer = stream._writer;
          if (writer !== void 0) {
            defaultWriterClosedPromiseReject(writer, stream._storedError);
          }
        }
        function WritableStreamUpdateBackpressure(stream, backpressure) {
          const writer = stream._writer;
          if (writer !== void 0 && backpressure !== stream._backpressure) {
            if (backpressure) {
              defaultWriterReadyPromiseReset(writer);
            } else {
              defaultWriterReadyPromiseResolve(writer);
            }
          }
          stream._backpressure = backpressure;
        }
        class WritableStreamDefaultWriter {
          constructor(stream) {
            assertRequiredArgument(stream, 1, "WritableStreamDefaultWriter");
            assertWritableStream(stream, "First parameter");
            if (IsWritableStreamLocked(stream)) {
              throw new TypeError("This stream has already been locked for exclusive writing by another writer");
            }
            this._ownerWritableStream = stream;
            stream._writer = this;
            const state = stream._state;
            if (state === "writable") {
              if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._backpressure) {
                defaultWriterReadyPromiseInitialize(this);
              } else {
                defaultWriterReadyPromiseInitializeAsResolved(this);
              }
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "erroring") {
              defaultWriterReadyPromiseInitializeAsRejected(this, stream._storedError);
              defaultWriterClosedPromiseInitialize(this);
            } else if (state === "closed") {
              defaultWriterReadyPromiseInitializeAsResolved(this);
              defaultWriterClosedPromiseInitializeAsResolved(this);
            } else {
              const storedError = stream._storedError;
              defaultWriterReadyPromiseInitializeAsRejected(this, storedError);
              defaultWriterClosedPromiseInitializeAsRejected(this, storedError);
            }
          }
          get closed() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("closed"));
            }
            return this._closedPromise;
          }
          get desiredSize() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("desiredSize");
            }
            if (this._ownerWritableStream === void 0) {
              throw defaultWriterLockException("desiredSize");
            }
            return WritableStreamDefaultWriterGetDesiredSize(this);
          }
          get ready() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("ready"));
            }
            return this._readyPromise;
          }
          abort(reason = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("abort"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("abort"));
            }
            return WritableStreamDefaultWriterAbort(this, reason);
          }
          close() {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("close"));
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("close"));
            }
            if (WritableStreamCloseQueuedOrInFlight(stream)) {
              return promiseRejectedWith(new TypeError("Cannot close an already-closing stream"));
            }
            return WritableStreamDefaultWriterClose(this);
          }
          releaseLock() {
            if (!IsWritableStreamDefaultWriter(this)) {
              throw defaultWriterBrandCheckException("releaseLock");
            }
            const stream = this._ownerWritableStream;
            if (stream === void 0) {
              return;
            }
            WritableStreamDefaultWriterRelease(this);
          }
          write(chunk = void 0) {
            if (!IsWritableStreamDefaultWriter(this)) {
              return promiseRejectedWith(defaultWriterBrandCheckException("write"));
            }
            if (this._ownerWritableStream === void 0) {
              return promiseRejectedWith(defaultWriterLockException("write to"));
            }
            return WritableStreamDefaultWriterWrite(this, chunk);
          }
        }
        Object.defineProperties(WritableStreamDefaultWriter.prototype, {
          abort: { enumerable: true },
          close: { enumerable: true },
          releaseLock: { enumerable: true },
          write: { enumerable: true },
          closed: { enumerable: true },
          desiredSize: { enumerable: true },
          ready: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultWriter.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultWriter",
            configurable: true
          });
        }
        function IsWritableStreamDefaultWriter(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_ownerWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultWriter;
        }
        function WritableStreamDefaultWriterAbort(writer, reason) {
          const stream = writer._ownerWritableStream;
          return WritableStreamAbort(stream, reason);
        }
        function WritableStreamDefaultWriterClose(writer) {
          const stream = writer._ownerWritableStream;
          return WritableStreamClose(stream);
        }
        function WritableStreamDefaultWriterCloseWithErrorPropagation(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          return WritableStreamDefaultWriterClose(writer);
        }
        function WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, error2) {
          if (writer._closedPromiseState === "pending") {
            defaultWriterClosedPromiseReject(writer, error2);
          } else {
            defaultWriterClosedPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, error2) {
          if (writer._readyPromiseState === "pending") {
            defaultWriterReadyPromiseReject(writer, error2);
          } else {
            defaultWriterReadyPromiseResetToRejected(writer, error2);
          }
        }
        function WritableStreamDefaultWriterGetDesiredSize(writer) {
          const stream = writer._ownerWritableStream;
          const state = stream._state;
          if (state === "errored" || state === "erroring") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return WritableStreamDefaultControllerGetDesiredSize(stream._writableStreamController);
        }
        function WritableStreamDefaultWriterRelease(writer) {
          const stream = writer._ownerWritableStream;
          const releasedError = new TypeError(`Writer was released and can no longer be used to monitor the stream's closedness`);
          WritableStreamDefaultWriterEnsureReadyPromiseRejected(writer, releasedError);
          WritableStreamDefaultWriterEnsureClosedPromiseRejected(writer, releasedError);
          stream._writer = void 0;
          writer._ownerWritableStream = void 0;
        }
        function WritableStreamDefaultWriterWrite(writer, chunk) {
          const stream = writer._ownerWritableStream;
          const controller = stream._writableStreamController;
          const chunkSize = WritableStreamDefaultControllerGetChunkSize(controller, chunk);
          if (stream !== writer._ownerWritableStream) {
            return promiseRejectedWith(defaultWriterLockException("write to"));
          }
          const state = stream._state;
          if (state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          if (WritableStreamCloseQueuedOrInFlight(stream) || state === "closed") {
            return promiseRejectedWith(new TypeError("The stream is closing or closed and cannot be written to"));
          }
          if (state === "erroring") {
            return promiseRejectedWith(stream._storedError);
          }
          const promise = WritableStreamAddWriteRequest(stream);
          WritableStreamDefaultControllerWrite(controller, chunk, chunkSize);
          return promise;
        }
        const closeSentinel = {};
        class WritableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get abortReason() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("abortReason");
            }
            return this._abortReason;
          }
          get signal() {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("signal");
            }
            if (this._abortController === void 0) {
              throw new TypeError("WritableStreamDefaultController.prototype.signal is not supported");
            }
            return this._abortController.signal;
          }
          error(e = void 0) {
            if (!IsWritableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$2("error");
            }
            const state = this._controlledWritableStream._state;
            if (state !== "writable") {
              return;
            }
            WritableStreamDefaultControllerError(this, e);
          }
          [AbortSteps](reason) {
            const result = this._abortAlgorithm(reason);
            WritableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [ErrorSteps]() {
            ResetQueue(this);
          }
        }
        Object.defineProperties(WritableStreamDefaultController.prototype, {
          error: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(WritableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "WritableStreamDefaultController",
            configurable: true
          });
        }
        function IsWritableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledWritableStream")) {
            return false;
          }
          return x instanceof WritableStreamDefaultController;
        }
        function SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledWritableStream = stream;
          stream._writableStreamController = controller;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._abortReason = void 0;
          controller._abortController = createAbortController();
          controller._started = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._writeAlgorithm = writeAlgorithm;
          controller._closeAlgorithm = closeAlgorithm;
          controller._abortAlgorithm = abortAlgorithm;
          const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
          WritableStreamUpdateBackpressure(stream, backpressure);
          const startResult = startAlgorithm();
          const startPromise = promiseResolvedWith(startResult);
          uponPromise(startPromise, () => {
            controller._started = true;
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (r) => {
            controller._started = true;
            WritableStreamDealWithRejection(stream, r);
          });
        }
        function SetUpWritableStreamDefaultControllerFromUnderlyingSink(stream, underlyingSink, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(WritableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let writeAlgorithm = () => promiseResolvedWith(void 0);
          let closeAlgorithm = () => promiseResolvedWith(void 0);
          let abortAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSink.start !== void 0) {
            startAlgorithm = () => underlyingSink.start(controller);
          }
          if (underlyingSink.write !== void 0) {
            writeAlgorithm = (chunk) => underlyingSink.write(chunk, controller);
          }
          if (underlyingSink.close !== void 0) {
            closeAlgorithm = () => underlyingSink.close();
          }
          if (underlyingSink.abort !== void 0) {
            abortAlgorithm = (reason) => underlyingSink.abort(reason);
          }
          SetUpWritableStreamDefaultController(stream, controller, startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function WritableStreamDefaultControllerClearAlgorithms(controller) {
          controller._writeAlgorithm = void 0;
          controller._closeAlgorithm = void 0;
          controller._abortAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function WritableStreamDefaultControllerClose(controller) {
          EnqueueValueWithSize(controller, closeSentinel, 0);
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerGetChunkSize(controller, chunk) {
          try {
            return controller._strategySizeAlgorithm(chunk);
          } catch (chunkSizeE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, chunkSizeE);
            return 1;
          }
        }
        function WritableStreamDefaultControllerGetDesiredSize(controller) {
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function WritableStreamDefaultControllerWrite(controller, chunk, chunkSize) {
          try {
            EnqueueValueWithSize(controller, chunk, chunkSize);
          } catch (enqueueE) {
            WritableStreamDefaultControllerErrorIfNeeded(controller, enqueueE);
            return;
          }
          const stream = controller._controlledWritableStream;
          if (!WritableStreamCloseQueuedOrInFlight(stream) && stream._state === "writable") {
            const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
            WritableStreamUpdateBackpressure(stream, backpressure);
          }
          WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
        }
        function WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller) {
          const stream = controller._controlledWritableStream;
          if (!controller._started) {
            return;
          }
          if (stream._inFlightWriteRequest !== void 0) {
            return;
          }
          const state = stream._state;
          if (state === "erroring") {
            WritableStreamFinishErroring(stream);
            return;
          }
          if (controller._queue.length === 0) {
            return;
          }
          const value = PeekQueueValue(controller);
          if (value === closeSentinel) {
            WritableStreamDefaultControllerProcessClose(controller);
          } else {
            WritableStreamDefaultControllerProcessWrite(controller, value);
          }
        }
        function WritableStreamDefaultControllerErrorIfNeeded(controller, error2) {
          if (controller._controlledWritableStream._state === "writable") {
            WritableStreamDefaultControllerError(controller, error2);
          }
        }
        function WritableStreamDefaultControllerProcessClose(controller) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkCloseRequestInFlight(stream);
          DequeueValue(controller);
          const sinkClosePromise = controller._closeAlgorithm();
          WritableStreamDefaultControllerClearAlgorithms(controller);
          uponPromise(sinkClosePromise, () => {
            WritableStreamFinishInFlightClose(stream);
          }, (reason) => {
            WritableStreamFinishInFlightCloseWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerProcessWrite(controller, chunk) {
          const stream = controller._controlledWritableStream;
          WritableStreamMarkFirstWriteRequestInFlight(stream);
          const sinkWritePromise = controller._writeAlgorithm(chunk);
          uponPromise(sinkWritePromise, () => {
            WritableStreamFinishInFlightWrite(stream);
            const state = stream._state;
            DequeueValue(controller);
            if (!WritableStreamCloseQueuedOrInFlight(stream) && state === "writable") {
              const backpressure = WritableStreamDefaultControllerGetBackpressure(controller);
              WritableStreamUpdateBackpressure(stream, backpressure);
            }
            WritableStreamDefaultControllerAdvanceQueueIfNeeded(controller);
          }, (reason) => {
            if (stream._state === "writable") {
              WritableStreamDefaultControllerClearAlgorithms(controller);
            }
            WritableStreamFinishInFlightWriteWithError(stream, reason);
          });
        }
        function WritableStreamDefaultControllerGetBackpressure(controller) {
          const desiredSize = WritableStreamDefaultControllerGetDesiredSize(controller);
          return desiredSize <= 0;
        }
        function WritableStreamDefaultControllerError(controller, error2) {
          const stream = controller._controlledWritableStream;
          WritableStreamDefaultControllerClearAlgorithms(controller);
          WritableStreamStartErroring(stream, error2);
        }
        function streamBrandCheckException$2(name) {
          return new TypeError(`WritableStream.prototype.${name} can only be used on a WritableStream`);
        }
        function defaultControllerBrandCheckException$2(name) {
          return new TypeError(`WritableStreamDefaultController.prototype.${name} can only be used on a WritableStreamDefaultController`);
        }
        function defaultWriterBrandCheckException(name) {
          return new TypeError(`WritableStreamDefaultWriter.prototype.${name} can only be used on a WritableStreamDefaultWriter`);
        }
        function defaultWriterLockException(name) {
          return new TypeError("Cannot " + name + " a stream using a released writer");
        }
        function defaultWriterClosedPromiseInitialize(writer) {
          writer._closedPromise = newPromise((resolve2, reject) => {
            writer._closedPromise_resolve = resolve2;
            writer._closedPromise_reject = reject;
            writer._closedPromiseState = "pending";
          });
        }
        function defaultWriterClosedPromiseInitializeAsRejected(writer, reason) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseReject(writer, reason);
        }
        function defaultWriterClosedPromiseInitializeAsResolved(writer) {
          defaultWriterClosedPromiseInitialize(writer);
          defaultWriterClosedPromiseResolve(writer);
        }
        function defaultWriterClosedPromiseReject(writer, reason) {
          if (writer._closedPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._closedPromise);
          writer._closedPromise_reject(reason);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "rejected";
        }
        function defaultWriterClosedPromiseResetToRejected(writer, reason) {
          defaultWriterClosedPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterClosedPromiseResolve(writer) {
          if (writer._closedPromise_resolve === void 0) {
            return;
          }
          writer._closedPromise_resolve(void 0);
          writer._closedPromise_resolve = void 0;
          writer._closedPromise_reject = void 0;
          writer._closedPromiseState = "resolved";
        }
        function defaultWriterReadyPromiseInitialize(writer) {
          writer._readyPromise = newPromise((resolve2, reject) => {
            writer._readyPromise_resolve = resolve2;
            writer._readyPromise_reject = reject;
          });
          writer._readyPromiseState = "pending";
        }
        function defaultWriterReadyPromiseInitializeAsRejected(writer, reason) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseReject(writer, reason);
        }
        function defaultWriterReadyPromiseInitializeAsResolved(writer) {
          defaultWriterReadyPromiseInitialize(writer);
          defaultWriterReadyPromiseResolve(writer);
        }
        function defaultWriterReadyPromiseReject(writer, reason) {
          if (writer._readyPromise_reject === void 0) {
            return;
          }
          setPromiseIsHandledToTrue(writer._readyPromise);
          writer._readyPromise_reject(reason);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "rejected";
        }
        function defaultWriterReadyPromiseReset(writer) {
          defaultWriterReadyPromiseInitialize(writer);
        }
        function defaultWriterReadyPromiseResetToRejected(writer, reason) {
          defaultWriterReadyPromiseInitializeAsRejected(writer, reason);
        }
        function defaultWriterReadyPromiseResolve(writer) {
          if (writer._readyPromise_resolve === void 0) {
            return;
          }
          writer._readyPromise_resolve(void 0);
          writer._readyPromise_resolve = void 0;
          writer._readyPromise_reject = void 0;
          writer._readyPromiseState = "fulfilled";
        }
        const NativeDOMException = typeof DOMException !== "undefined" ? DOMException : void 0;
        function isDOMExceptionConstructor(ctor) {
          if (!(typeof ctor === "function" || typeof ctor === "object")) {
            return false;
          }
          try {
            new ctor();
            return true;
          } catch (_a) {
            return false;
          }
        }
        function createDOMExceptionPolyfill() {
          const ctor = function DOMException2(message, name) {
            this.message = message || "";
            this.name = name || "Error";
            if (Error.captureStackTrace) {
              Error.captureStackTrace(this, this.constructor);
            }
          };
          ctor.prototype = Object.create(Error.prototype);
          Object.defineProperty(ctor.prototype, "constructor", { value: ctor, writable: true, configurable: true });
          return ctor;
        }
        const DOMException$1 = isDOMExceptionConstructor(NativeDOMException) ? NativeDOMException : createDOMExceptionPolyfill();
        function ReadableStreamPipeTo(source, dest, preventClose, preventAbort, preventCancel, signal) {
          const reader = AcquireReadableStreamDefaultReader(source);
          const writer = AcquireWritableStreamDefaultWriter(dest);
          source._disturbed = true;
          let shuttingDown = false;
          let currentWrite = promiseResolvedWith(void 0);
          return newPromise((resolve2, reject) => {
            let abortAlgorithm;
            if (signal !== void 0) {
              abortAlgorithm = () => {
                const error2 = new DOMException$1("Aborted", "AbortError");
                const actions = [];
                if (!preventAbort) {
                  actions.push(() => {
                    if (dest._state === "writable") {
                      return WritableStreamAbort(dest, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                if (!preventCancel) {
                  actions.push(() => {
                    if (source._state === "readable") {
                      return ReadableStreamCancel(source, error2);
                    }
                    return promiseResolvedWith(void 0);
                  });
                }
                shutdownWithAction(() => Promise.all(actions.map((action) => action())), true, error2);
              };
              if (signal.aborted) {
                abortAlgorithm();
                return;
              }
              signal.addEventListener("abort", abortAlgorithm);
            }
            function pipeLoop() {
              return newPromise((resolveLoop, rejectLoop) => {
                function next(done) {
                  if (done) {
                    resolveLoop();
                  } else {
                    PerformPromiseThen(pipeStep(), next, rejectLoop);
                  }
                }
                next(false);
              });
            }
            function pipeStep() {
              if (shuttingDown) {
                return promiseResolvedWith(true);
              }
              return PerformPromiseThen(writer._readyPromise, () => {
                return newPromise((resolveRead, rejectRead) => {
                  ReadableStreamDefaultReaderRead(reader, {
                    _chunkSteps: (chunk) => {
                      currentWrite = PerformPromiseThen(WritableStreamDefaultWriterWrite(writer, chunk), void 0, noop2);
                      resolveRead(false);
                    },
                    _closeSteps: () => resolveRead(true),
                    _errorSteps: rejectRead
                  });
                });
              });
            }
            isOrBecomesErrored(source, reader._closedPromise, (storedError) => {
              if (!preventAbort) {
                shutdownWithAction(() => WritableStreamAbort(dest, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesErrored(dest, writer._closedPromise, (storedError) => {
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, storedError), true, storedError);
              } else {
                shutdown(true, storedError);
              }
            });
            isOrBecomesClosed(source, reader._closedPromise, () => {
              if (!preventClose) {
                shutdownWithAction(() => WritableStreamDefaultWriterCloseWithErrorPropagation(writer));
              } else {
                shutdown();
              }
            });
            if (WritableStreamCloseQueuedOrInFlight(dest) || dest._state === "closed") {
              const destClosed = new TypeError("the destination writable stream closed before all data could be piped to it");
              if (!preventCancel) {
                shutdownWithAction(() => ReadableStreamCancel(source, destClosed), true, destClosed);
              } else {
                shutdown(true, destClosed);
              }
            }
            setPromiseIsHandledToTrue(pipeLoop());
            function waitForWritesToFinish() {
              const oldCurrentWrite = currentWrite;
              return PerformPromiseThen(currentWrite, () => oldCurrentWrite !== currentWrite ? waitForWritesToFinish() : void 0);
            }
            function isOrBecomesErrored(stream, promise, action) {
              if (stream._state === "errored") {
                action(stream._storedError);
              } else {
                uponRejection(promise, action);
              }
            }
            function isOrBecomesClosed(stream, promise, action) {
              if (stream._state === "closed") {
                action();
              } else {
                uponFulfillment(promise, action);
              }
            }
            function shutdownWithAction(action, originalIsError, originalError) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), doTheRest);
              } else {
                doTheRest();
              }
              function doTheRest() {
                uponPromise(action(), () => finalize(originalIsError, originalError), (newError) => finalize(true, newError));
              }
            }
            function shutdown(isError, error2) {
              if (shuttingDown) {
                return;
              }
              shuttingDown = true;
              if (dest._state === "writable" && !WritableStreamCloseQueuedOrInFlight(dest)) {
                uponFulfillment(waitForWritesToFinish(), () => finalize(isError, error2));
              } else {
                finalize(isError, error2);
              }
            }
            function finalize(isError, error2) {
              WritableStreamDefaultWriterRelease(writer);
              ReadableStreamReaderGenericRelease(reader);
              if (signal !== void 0) {
                signal.removeEventListener("abort", abortAlgorithm);
              }
              if (isError) {
                reject(error2);
              } else {
                resolve2(void 0);
              }
            }
          });
        }
        class ReadableStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("desiredSize");
            }
            return ReadableStreamDefaultControllerGetDesiredSize(this);
          }
          close() {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("close");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits close");
            }
            ReadableStreamDefaultControllerClose(this);
          }
          enqueue(chunk = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("enqueue");
            }
            if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(this)) {
              throw new TypeError("The stream is not in a state that permits enqueue");
            }
            return ReadableStreamDefaultControllerEnqueue(this, chunk);
          }
          error(e = void 0) {
            if (!IsReadableStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException$1("error");
            }
            ReadableStreamDefaultControllerError(this, e);
          }
          [CancelSteps](reason) {
            ResetQueue(this);
            const result = this._cancelAlgorithm(reason);
            ReadableStreamDefaultControllerClearAlgorithms(this);
            return result;
          }
          [PullSteps](readRequest) {
            const stream = this._controlledReadableStream;
            if (this._queue.length > 0) {
              const chunk = DequeueValue(this);
              if (this._closeRequested && this._queue.length === 0) {
                ReadableStreamDefaultControllerClearAlgorithms(this);
                ReadableStreamClose(stream);
              } else {
                ReadableStreamDefaultControllerCallPullIfNeeded(this);
              }
              readRequest._chunkSteps(chunk);
            } else {
              ReadableStreamAddReadRequest(stream, readRequest);
              ReadableStreamDefaultControllerCallPullIfNeeded(this);
            }
          }
        }
        Object.defineProperties(ReadableStreamDefaultController.prototype, {
          close: { enumerable: true },
          enqueue: { enumerable: true },
          error: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStreamDefaultController",
            configurable: true
          });
        }
        function IsReadableStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledReadableStream")) {
            return false;
          }
          return x instanceof ReadableStreamDefaultController;
        }
        function ReadableStreamDefaultControllerCallPullIfNeeded(controller) {
          const shouldPull = ReadableStreamDefaultControllerShouldCallPull(controller);
          if (!shouldPull) {
            return;
          }
          if (controller._pulling) {
            controller._pullAgain = true;
            return;
          }
          controller._pulling = true;
          const pullPromise = controller._pullAlgorithm();
          uponPromise(pullPromise, () => {
            controller._pulling = false;
            if (controller._pullAgain) {
              controller._pullAgain = false;
              ReadableStreamDefaultControllerCallPullIfNeeded(controller);
            }
          }, (e) => {
            ReadableStreamDefaultControllerError(controller, e);
          });
        }
        function ReadableStreamDefaultControllerShouldCallPull(controller) {
          const stream = controller._controlledReadableStream;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return false;
          }
          if (!controller._started) {
            return false;
          }
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            return true;
          }
          const desiredSize = ReadableStreamDefaultControllerGetDesiredSize(controller);
          if (desiredSize > 0) {
            return true;
          }
          return false;
        }
        function ReadableStreamDefaultControllerClearAlgorithms(controller) {
          controller._pullAlgorithm = void 0;
          controller._cancelAlgorithm = void 0;
          controller._strategySizeAlgorithm = void 0;
        }
        function ReadableStreamDefaultControllerClose(controller) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          controller._closeRequested = true;
          if (controller._queue.length === 0) {
            ReadableStreamDefaultControllerClearAlgorithms(controller);
            ReadableStreamClose(stream);
          }
        }
        function ReadableStreamDefaultControllerEnqueue(controller, chunk) {
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(controller)) {
            return;
          }
          const stream = controller._controlledReadableStream;
          if (IsReadableStreamLocked(stream) && ReadableStreamGetNumReadRequests(stream) > 0) {
            ReadableStreamFulfillReadRequest(stream, chunk, false);
          } else {
            let chunkSize;
            try {
              chunkSize = controller._strategySizeAlgorithm(chunk);
            } catch (chunkSizeE) {
              ReadableStreamDefaultControllerError(controller, chunkSizeE);
              throw chunkSizeE;
            }
            try {
              EnqueueValueWithSize(controller, chunk, chunkSize);
            } catch (enqueueE) {
              ReadableStreamDefaultControllerError(controller, enqueueE);
              throw enqueueE;
            }
          }
          ReadableStreamDefaultControllerCallPullIfNeeded(controller);
        }
        function ReadableStreamDefaultControllerError(controller, e) {
          const stream = controller._controlledReadableStream;
          if (stream._state !== "readable") {
            return;
          }
          ResetQueue(controller);
          ReadableStreamDefaultControllerClearAlgorithms(controller);
          ReadableStreamError(stream, e);
        }
        function ReadableStreamDefaultControllerGetDesiredSize(controller) {
          const state = controller._controlledReadableStream._state;
          if (state === "errored") {
            return null;
          }
          if (state === "closed") {
            return 0;
          }
          return controller._strategyHWM - controller._queueTotalSize;
        }
        function ReadableStreamDefaultControllerHasBackpressure(controller) {
          if (ReadableStreamDefaultControllerShouldCallPull(controller)) {
            return false;
          }
          return true;
        }
        function ReadableStreamDefaultControllerCanCloseOrEnqueue(controller) {
          const state = controller._controlledReadableStream._state;
          if (!controller._closeRequested && state === "readable") {
            return true;
          }
          return false;
        }
        function SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm) {
          controller._controlledReadableStream = stream;
          controller._queue = void 0;
          controller._queueTotalSize = void 0;
          ResetQueue(controller);
          controller._started = false;
          controller._closeRequested = false;
          controller._pullAgain = false;
          controller._pulling = false;
          controller._strategySizeAlgorithm = sizeAlgorithm;
          controller._strategyHWM = highWaterMark;
          controller._pullAlgorithm = pullAlgorithm;
          controller._cancelAlgorithm = cancelAlgorithm;
          stream._readableStreamController = controller;
          const startResult = startAlgorithm();
          uponPromise(promiseResolvedWith(startResult), () => {
            controller._started = true;
            ReadableStreamDefaultControllerCallPullIfNeeded(controller);
          }, (r) => {
            ReadableStreamDefaultControllerError(controller, r);
          });
        }
        function SetUpReadableStreamDefaultControllerFromUnderlyingSource(stream, underlyingSource, highWaterMark, sizeAlgorithm) {
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          let startAlgorithm = () => void 0;
          let pullAlgorithm = () => promiseResolvedWith(void 0);
          let cancelAlgorithm = () => promiseResolvedWith(void 0);
          if (underlyingSource.start !== void 0) {
            startAlgorithm = () => underlyingSource.start(controller);
          }
          if (underlyingSource.pull !== void 0) {
            pullAlgorithm = () => underlyingSource.pull(controller);
          }
          if (underlyingSource.cancel !== void 0) {
            cancelAlgorithm = (reason) => underlyingSource.cancel(reason);
          }
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
        }
        function defaultControllerBrandCheckException$1(name) {
          return new TypeError(`ReadableStreamDefaultController.prototype.${name} can only be used on a ReadableStreamDefaultController`);
        }
        function ReadableStreamTee(stream, cloneForBranch2) {
          if (IsReadableByteStreamController(stream._readableStreamController)) {
            return ReadableByteStreamTee(stream);
          }
          return ReadableStreamDefaultTee(stream);
        }
        function ReadableStreamDefaultTee(stream, cloneForBranch2) {
          const reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function pullAlgorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  const chunk2 = chunk;
                  if (!canceled1) {
                    ReadableStreamDefaultControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableStreamDefaultControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableStreamDefaultControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableStreamDefaultControllerClose(branch2._readableStreamController);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
          }
          branch1 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel1Algorithm);
          branch2 = CreateReadableStream(startAlgorithm, pullAlgorithm, cancel2Algorithm);
          uponRejection(reader._closedPromise, (r) => {
            ReadableStreamDefaultControllerError(branch1._readableStreamController, r);
            ReadableStreamDefaultControllerError(branch2._readableStreamController, r);
            if (!canceled1 || !canceled2) {
              resolveCancelPromise(void 0);
            }
          });
          return [branch1, branch2];
        }
        function ReadableByteStreamTee(stream) {
          let reader = AcquireReadableStreamDefaultReader(stream);
          let reading = false;
          let canceled1 = false;
          let canceled2 = false;
          let reason1;
          let reason2;
          let branch1;
          let branch2;
          let resolveCancelPromise;
          const cancelPromise = newPromise((resolve2) => {
            resolveCancelPromise = resolve2;
          });
          function forwardReaderError(thisReader) {
            uponRejection(thisReader._closedPromise, (r) => {
              if (thisReader !== reader) {
                return;
              }
              ReadableByteStreamControllerError(branch1._readableStreamController, r);
              ReadableByteStreamControllerError(branch2._readableStreamController, r);
              if (!canceled1 || !canceled2) {
                resolveCancelPromise(void 0);
              }
            });
          }
          function pullWithDefaultReader() {
            if (IsReadableStreamBYOBReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamDefaultReader(stream);
              forwardReaderError(reader);
            }
            const readRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const chunk1 = chunk;
                  let chunk2 = chunk;
                  if (!canceled1 && !canceled2) {
                    try {
                      chunk2 = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(branch1._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(branch2._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                  }
                  if (!canceled1) {
                    ReadableByteStreamControllerEnqueue(branch1._readableStreamController, chunk1);
                  }
                  if (!canceled2) {
                    ReadableByteStreamControllerEnqueue(branch2._readableStreamController, chunk2);
                  }
                });
              },
              _closeSteps: () => {
                reading = false;
                if (!canceled1) {
                  ReadableByteStreamControllerClose(branch1._readableStreamController);
                }
                if (!canceled2) {
                  ReadableByteStreamControllerClose(branch2._readableStreamController);
                }
                if (branch1._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch1._readableStreamController, 0);
                }
                if (branch2._readableStreamController._pendingPullIntos.length > 0) {
                  ReadableByteStreamControllerRespond(branch2._readableStreamController, 0);
                }
                if (!canceled1 || !canceled2) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamDefaultReaderRead(reader, readRequest);
          }
          function pullWithBYOBReader(view, forBranch2) {
            if (IsReadableStreamDefaultReader(reader)) {
              ReadableStreamReaderGenericRelease(reader);
              reader = AcquireReadableStreamBYOBReader(stream);
              forwardReaderError(reader);
            }
            const byobBranch = forBranch2 ? branch2 : branch1;
            const otherBranch = forBranch2 ? branch1 : branch2;
            const readIntoRequest = {
              _chunkSteps: (chunk) => {
                queueMicrotask(() => {
                  reading = false;
                  const byobCanceled = forBranch2 ? canceled2 : canceled1;
                  const otherCanceled = forBranch2 ? canceled1 : canceled2;
                  if (!otherCanceled) {
                    let clonedChunk;
                    try {
                      clonedChunk = CloneAsUint8Array(chunk);
                    } catch (cloneE) {
                      ReadableByteStreamControllerError(byobBranch._readableStreamController, cloneE);
                      ReadableByteStreamControllerError(otherBranch._readableStreamController, cloneE);
                      resolveCancelPromise(ReadableStreamCancel(stream, cloneE));
                      return;
                    }
                    if (!byobCanceled) {
                      ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                    }
                    ReadableByteStreamControllerEnqueue(otherBranch._readableStreamController, clonedChunk);
                  } else if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                });
              },
              _closeSteps: (chunk) => {
                reading = false;
                const byobCanceled = forBranch2 ? canceled2 : canceled1;
                const otherCanceled = forBranch2 ? canceled1 : canceled2;
                if (!byobCanceled) {
                  ReadableByteStreamControllerClose(byobBranch._readableStreamController);
                }
                if (!otherCanceled) {
                  ReadableByteStreamControllerClose(otherBranch._readableStreamController);
                }
                if (chunk !== void 0) {
                  if (!byobCanceled) {
                    ReadableByteStreamControllerRespondWithNewView(byobBranch._readableStreamController, chunk);
                  }
                  if (!otherCanceled && otherBranch._readableStreamController._pendingPullIntos.length > 0) {
                    ReadableByteStreamControllerRespond(otherBranch._readableStreamController, 0);
                  }
                }
                if (!byobCanceled || !otherCanceled) {
                  resolveCancelPromise(void 0);
                }
              },
              _errorSteps: () => {
                reading = false;
              }
            };
            ReadableStreamBYOBReaderRead(reader, view, readIntoRequest);
          }
          function pull1Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch1._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, false);
            }
            return promiseResolvedWith(void 0);
          }
          function pull2Algorithm() {
            if (reading) {
              return promiseResolvedWith(void 0);
            }
            reading = true;
            const byobRequest = ReadableByteStreamControllerGetBYOBRequest(branch2._readableStreamController);
            if (byobRequest === null) {
              pullWithDefaultReader();
            } else {
              pullWithBYOBReader(byobRequest._view, true);
            }
            return promiseResolvedWith(void 0);
          }
          function cancel1Algorithm(reason) {
            canceled1 = true;
            reason1 = reason;
            if (canceled2) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function cancel2Algorithm(reason) {
            canceled2 = true;
            reason2 = reason;
            if (canceled1) {
              const compositeReason = CreateArrayFromList([reason1, reason2]);
              const cancelResult = ReadableStreamCancel(stream, compositeReason);
              resolveCancelPromise(cancelResult);
            }
            return cancelPromise;
          }
          function startAlgorithm() {
            return;
          }
          branch1 = CreateReadableByteStream(startAlgorithm, pull1Algorithm, cancel1Algorithm);
          branch2 = CreateReadableByteStream(startAlgorithm, pull2Algorithm, cancel2Algorithm);
          forwardReaderError(reader);
          return [branch1, branch2];
        }
        function convertUnderlyingDefaultOrByteSource(source, context) {
          assertDictionary(source, context);
          const original = source;
          const autoAllocateChunkSize = original === null || original === void 0 ? void 0 : original.autoAllocateChunkSize;
          const cancel = original === null || original === void 0 ? void 0 : original.cancel;
          const pull = original === null || original === void 0 ? void 0 : original.pull;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const type = original === null || original === void 0 ? void 0 : original.type;
          return {
            autoAllocateChunkSize: autoAllocateChunkSize === void 0 ? void 0 : convertUnsignedLongLongWithEnforceRange(autoAllocateChunkSize, `${context} has member 'autoAllocateChunkSize' that`),
            cancel: cancel === void 0 ? void 0 : convertUnderlyingSourceCancelCallback(cancel, original, `${context} has member 'cancel' that`),
            pull: pull === void 0 ? void 0 : convertUnderlyingSourcePullCallback(pull, original, `${context} has member 'pull' that`),
            start: start === void 0 ? void 0 : convertUnderlyingSourceStartCallback(start, original, `${context} has member 'start' that`),
            type: type === void 0 ? void 0 : convertReadableStreamType(type, `${context} has member 'type' that`)
          };
        }
        function convertUnderlyingSourceCancelCallback(fn, original, context) {
          assertFunction(fn, context);
          return (reason) => promiseCall(fn, original, [reason]);
        }
        function convertUnderlyingSourcePullCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertUnderlyingSourceStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertReadableStreamType(type, context) {
          type = `${type}`;
          if (type !== "bytes") {
            throw new TypeError(`${context} '${type}' is not a valid enumeration value for ReadableStreamType`);
          }
          return type;
        }
        function convertReaderOptions(options3, context) {
          assertDictionary(options3, context);
          const mode = options3 === null || options3 === void 0 ? void 0 : options3.mode;
          return {
            mode: mode === void 0 ? void 0 : convertReadableStreamReaderMode(mode, `${context} has member 'mode' that`)
          };
        }
        function convertReadableStreamReaderMode(mode, context) {
          mode = `${mode}`;
          if (mode !== "byob") {
            throw new TypeError(`${context} '${mode}' is not a valid enumeration value for ReadableStreamReaderMode`);
          }
          return mode;
        }
        function convertIteratorOptions(options3, context) {
          assertDictionary(options3, context);
          const preventCancel = options3 === null || options3 === void 0 ? void 0 : options3.preventCancel;
          return { preventCancel: Boolean(preventCancel) };
        }
        function convertPipeOptions(options3, context) {
          assertDictionary(options3, context);
          const preventAbort = options3 === null || options3 === void 0 ? void 0 : options3.preventAbort;
          const preventCancel = options3 === null || options3 === void 0 ? void 0 : options3.preventCancel;
          const preventClose = options3 === null || options3 === void 0 ? void 0 : options3.preventClose;
          const signal = options3 === null || options3 === void 0 ? void 0 : options3.signal;
          if (signal !== void 0) {
            assertAbortSignal(signal, `${context} has member 'signal' that`);
          }
          return {
            preventAbort: Boolean(preventAbort),
            preventCancel: Boolean(preventCancel),
            preventClose: Boolean(preventClose),
            signal
          };
        }
        function assertAbortSignal(signal, context) {
          if (!isAbortSignal2(signal)) {
            throw new TypeError(`${context} is not an AbortSignal.`);
          }
        }
        function convertReadableWritablePair(pair, context) {
          assertDictionary(pair, context);
          const readable2 = pair === null || pair === void 0 ? void 0 : pair.readable;
          assertRequiredField(readable2, "readable", "ReadableWritablePair");
          assertReadableStream(readable2, `${context} has member 'readable' that`);
          const writable2 = pair === null || pair === void 0 ? void 0 : pair.writable;
          assertRequiredField(writable2, "writable", "ReadableWritablePair");
          assertWritableStream(writable2, `${context} has member 'writable' that`);
          return { readable: readable2, writable: writable2 };
        }
        class ReadableStream2 {
          constructor(rawUnderlyingSource = {}, rawStrategy = {}) {
            if (rawUnderlyingSource === void 0) {
              rawUnderlyingSource = null;
            } else {
              assertObject(rawUnderlyingSource, "First parameter");
            }
            const strategy = convertQueuingStrategy(rawStrategy, "Second parameter");
            const underlyingSource = convertUnderlyingDefaultOrByteSource(rawUnderlyingSource, "First parameter");
            InitializeReadableStream(this);
            if (underlyingSource.type === "bytes") {
              if (strategy.size !== void 0) {
                throw new RangeError("The strategy for a byte stream cannot have a size function");
              }
              const highWaterMark = ExtractHighWaterMark(strategy, 0);
              SetUpReadableByteStreamControllerFromUnderlyingSource(this, underlyingSource, highWaterMark);
            } else {
              const sizeAlgorithm = ExtractSizeAlgorithm(strategy);
              const highWaterMark = ExtractHighWaterMark(strategy, 1);
              SetUpReadableStreamDefaultControllerFromUnderlyingSource(this, underlyingSource, highWaterMark, sizeAlgorithm);
            }
          }
          get locked() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("locked");
            }
            return IsReadableStreamLocked(this);
          }
          cancel(reason = void 0) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("cancel"));
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("Cannot cancel a stream that already has a reader"));
            }
            return ReadableStreamCancel(this, reason);
          }
          getReader(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("getReader");
            }
            const options3 = convertReaderOptions(rawOptions, "First parameter");
            if (options3.mode === void 0) {
              return AcquireReadableStreamDefaultReader(this);
            }
            return AcquireReadableStreamBYOBReader(this);
          }
          pipeThrough(rawTransform, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("pipeThrough");
            }
            assertRequiredArgument(rawTransform, 1, "pipeThrough");
            const transform = convertReadableWritablePair(rawTransform, "First parameter");
            const options3 = convertPipeOptions(rawOptions, "Second parameter");
            if (IsReadableStreamLocked(this)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked ReadableStream");
            }
            if (IsWritableStreamLocked(transform.writable)) {
              throw new TypeError("ReadableStream.prototype.pipeThrough cannot be used on a locked WritableStream");
            }
            const promise = ReadableStreamPipeTo(this, transform.writable, options3.preventClose, options3.preventAbort, options3.preventCancel, options3.signal);
            setPromiseIsHandledToTrue(promise);
            return transform.readable;
          }
          pipeTo(destination, rawOptions = {}) {
            if (!IsReadableStream(this)) {
              return promiseRejectedWith(streamBrandCheckException$1("pipeTo"));
            }
            if (destination === void 0) {
              return promiseRejectedWith(`Parameter 1 is required in 'pipeTo'.`);
            }
            if (!IsWritableStream(destination)) {
              return promiseRejectedWith(new TypeError(`ReadableStream.prototype.pipeTo's first argument must be a WritableStream`));
            }
            let options3;
            try {
              options3 = convertPipeOptions(rawOptions, "Second parameter");
            } catch (e) {
              return promiseRejectedWith(e);
            }
            if (IsReadableStreamLocked(this)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked ReadableStream"));
            }
            if (IsWritableStreamLocked(destination)) {
              return promiseRejectedWith(new TypeError("ReadableStream.prototype.pipeTo cannot be used on a locked WritableStream"));
            }
            return ReadableStreamPipeTo(this, destination, options3.preventClose, options3.preventAbort, options3.preventCancel, options3.signal);
          }
          tee() {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("tee");
            }
            const branches = ReadableStreamTee(this);
            return CreateArrayFromList(branches);
          }
          values(rawOptions = void 0) {
            if (!IsReadableStream(this)) {
              throw streamBrandCheckException$1("values");
            }
            const options3 = convertIteratorOptions(rawOptions, "First parameter");
            return AcquireReadableStreamAsyncIterator(this, options3.preventCancel);
          }
        }
        Object.defineProperties(ReadableStream2.prototype, {
          cancel: { enumerable: true },
          getReader: { enumerable: true },
          pipeThrough: { enumerable: true },
          pipeTo: { enumerable: true },
          tee: { enumerable: true },
          values: { enumerable: true },
          locked: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.toStringTag, {
            value: "ReadableStream",
            configurable: true
          });
        }
        if (typeof SymbolPolyfill.asyncIterator === "symbol") {
          Object.defineProperty(ReadableStream2.prototype, SymbolPolyfill.asyncIterator, {
            value: ReadableStream2.prototype.values,
            writable: true,
            configurable: true
          });
        }
        function CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark = 1, sizeAlgorithm = () => 1) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableStreamDefaultController.prototype);
          SetUpReadableStreamDefaultController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, highWaterMark, sizeAlgorithm);
          return stream;
        }
        function CreateReadableByteStream(startAlgorithm, pullAlgorithm, cancelAlgorithm) {
          const stream = Object.create(ReadableStream2.prototype);
          InitializeReadableStream(stream);
          const controller = Object.create(ReadableByteStreamController.prototype);
          SetUpReadableByteStreamController(stream, controller, startAlgorithm, pullAlgorithm, cancelAlgorithm, 0, void 0);
          return stream;
        }
        function InitializeReadableStream(stream) {
          stream._state = "readable";
          stream._reader = void 0;
          stream._storedError = void 0;
          stream._disturbed = false;
        }
        function IsReadableStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_readableStreamController")) {
            return false;
          }
          return x instanceof ReadableStream2;
        }
        function IsReadableStreamLocked(stream) {
          if (stream._reader === void 0) {
            return false;
          }
          return true;
        }
        function ReadableStreamCancel(stream, reason) {
          stream._disturbed = true;
          if (stream._state === "closed") {
            return promiseResolvedWith(void 0);
          }
          if (stream._state === "errored") {
            return promiseRejectedWith(stream._storedError);
          }
          ReadableStreamClose(stream);
          const reader = stream._reader;
          if (reader !== void 0 && IsReadableStreamBYOBReader(reader)) {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._closeSteps(void 0);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
          const sourceCancelPromise = stream._readableStreamController[CancelSteps](reason);
          return transformPromiseWith(sourceCancelPromise, noop2);
        }
        function ReadableStreamClose(stream) {
          stream._state = "closed";
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseResolve(reader);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._closeSteps();
            });
            reader._readRequests = new SimpleQueue();
          }
        }
        function ReadableStreamError(stream, e) {
          stream._state = "errored";
          stream._storedError = e;
          const reader = stream._reader;
          if (reader === void 0) {
            return;
          }
          defaultReaderClosedPromiseReject(reader, e);
          if (IsReadableStreamDefaultReader(reader)) {
            reader._readRequests.forEach((readRequest) => {
              readRequest._errorSteps(e);
            });
            reader._readRequests = new SimpleQueue();
          } else {
            reader._readIntoRequests.forEach((readIntoRequest) => {
              readIntoRequest._errorSteps(e);
            });
            reader._readIntoRequests = new SimpleQueue();
          }
        }
        function streamBrandCheckException$1(name) {
          return new TypeError(`ReadableStream.prototype.${name} can only be used on a ReadableStream`);
        }
        function convertQueuingStrategyInit(init2, context) {
          assertDictionary(init2, context);
          const highWaterMark = init2 === null || init2 === void 0 ? void 0 : init2.highWaterMark;
          assertRequiredField(highWaterMark, "highWaterMark", "QueuingStrategyInit");
          return {
            highWaterMark: convertUnrestrictedDouble(highWaterMark)
          };
        }
        const byteLengthSizeFunction = (chunk) => {
          return chunk.byteLength;
        };
        Object.defineProperty(byteLengthSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class ByteLengthQueuingStrategy {
          constructor(options3) {
            assertRequiredArgument(options3, 1, "ByteLengthQueuingStrategy");
            options3 = convertQueuingStrategyInit(options3, "First parameter");
            this._byteLengthQueuingStrategyHighWaterMark = options3.highWaterMark;
          }
          get highWaterMark() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("highWaterMark");
            }
            return this._byteLengthQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsByteLengthQueuingStrategy(this)) {
              throw byteLengthBrandCheckException("size");
            }
            return byteLengthSizeFunction;
          }
        }
        Object.defineProperties(ByteLengthQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(ByteLengthQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "ByteLengthQueuingStrategy",
            configurable: true
          });
        }
        function byteLengthBrandCheckException(name) {
          return new TypeError(`ByteLengthQueuingStrategy.prototype.${name} can only be used on a ByteLengthQueuingStrategy`);
        }
        function IsByteLengthQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_byteLengthQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof ByteLengthQueuingStrategy;
        }
        const countSizeFunction = () => {
          return 1;
        };
        Object.defineProperty(countSizeFunction, "name", {
          value: "size",
          configurable: true
        });
        class CountQueuingStrategy {
          constructor(options3) {
            assertRequiredArgument(options3, 1, "CountQueuingStrategy");
            options3 = convertQueuingStrategyInit(options3, "First parameter");
            this._countQueuingStrategyHighWaterMark = options3.highWaterMark;
          }
          get highWaterMark() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("highWaterMark");
            }
            return this._countQueuingStrategyHighWaterMark;
          }
          get size() {
            if (!IsCountQueuingStrategy(this)) {
              throw countBrandCheckException("size");
            }
            return countSizeFunction;
          }
        }
        Object.defineProperties(CountQueuingStrategy.prototype, {
          highWaterMark: { enumerable: true },
          size: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(CountQueuingStrategy.prototype, SymbolPolyfill.toStringTag, {
            value: "CountQueuingStrategy",
            configurable: true
          });
        }
        function countBrandCheckException(name) {
          return new TypeError(`CountQueuingStrategy.prototype.${name} can only be used on a CountQueuingStrategy`);
        }
        function IsCountQueuingStrategy(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_countQueuingStrategyHighWaterMark")) {
            return false;
          }
          return x instanceof CountQueuingStrategy;
        }
        function convertTransformer(original, context) {
          assertDictionary(original, context);
          const flush = original === null || original === void 0 ? void 0 : original.flush;
          const readableType = original === null || original === void 0 ? void 0 : original.readableType;
          const start = original === null || original === void 0 ? void 0 : original.start;
          const transform = original === null || original === void 0 ? void 0 : original.transform;
          const writableType = original === null || original === void 0 ? void 0 : original.writableType;
          return {
            flush: flush === void 0 ? void 0 : convertTransformerFlushCallback(flush, original, `${context} has member 'flush' that`),
            readableType,
            start: start === void 0 ? void 0 : convertTransformerStartCallback(start, original, `${context} has member 'start' that`),
            transform: transform === void 0 ? void 0 : convertTransformerTransformCallback(transform, original, `${context} has member 'transform' that`),
            writableType
          };
        }
        function convertTransformerFlushCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => promiseCall(fn, original, [controller]);
        }
        function convertTransformerStartCallback(fn, original, context) {
          assertFunction(fn, context);
          return (controller) => reflectCall(fn, original, [controller]);
        }
        function convertTransformerTransformCallback(fn, original, context) {
          assertFunction(fn, context);
          return (chunk, controller) => promiseCall(fn, original, [chunk, controller]);
        }
        class TransformStream {
          constructor(rawTransformer = {}, rawWritableStrategy = {}, rawReadableStrategy = {}) {
            if (rawTransformer === void 0) {
              rawTransformer = null;
            }
            const writableStrategy = convertQueuingStrategy(rawWritableStrategy, "Second parameter");
            const readableStrategy = convertQueuingStrategy(rawReadableStrategy, "Third parameter");
            const transformer = convertTransformer(rawTransformer, "First parameter");
            if (transformer.readableType !== void 0) {
              throw new RangeError("Invalid readableType specified");
            }
            if (transformer.writableType !== void 0) {
              throw new RangeError("Invalid writableType specified");
            }
            const readableHighWaterMark = ExtractHighWaterMark(readableStrategy, 0);
            const readableSizeAlgorithm = ExtractSizeAlgorithm(readableStrategy);
            const writableHighWaterMark = ExtractHighWaterMark(writableStrategy, 1);
            const writableSizeAlgorithm = ExtractSizeAlgorithm(writableStrategy);
            let startPromise_resolve;
            const startPromise = newPromise((resolve2) => {
              startPromise_resolve = resolve2;
            });
            InitializeTransformStream(this, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
            SetUpTransformStreamDefaultControllerFromTransformer(this, transformer);
            if (transformer.start !== void 0) {
              startPromise_resolve(transformer.start(this._transformStreamController));
            } else {
              startPromise_resolve(void 0);
            }
          }
          get readable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("readable");
            }
            return this._readable;
          }
          get writable() {
            if (!IsTransformStream(this)) {
              throw streamBrandCheckException("writable");
            }
            return this._writable;
          }
        }
        Object.defineProperties(TransformStream.prototype, {
          readable: { enumerable: true },
          writable: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStream.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStream",
            configurable: true
          });
        }
        function InitializeTransformStream(stream, startPromise, writableHighWaterMark, writableSizeAlgorithm, readableHighWaterMark, readableSizeAlgorithm) {
          function startAlgorithm() {
            return startPromise;
          }
          function writeAlgorithm(chunk) {
            return TransformStreamDefaultSinkWriteAlgorithm(stream, chunk);
          }
          function abortAlgorithm(reason) {
            return TransformStreamDefaultSinkAbortAlgorithm(stream, reason);
          }
          function closeAlgorithm() {
            return TransformStreamDefaultSinkCloseAlgorithm(stream);
          }
          stream._writable = CreateWritableStream(startAlgorithm, writeAlgorithm, closeAlgorithm, abortAlgorithm, writableHighWaterMark, writableSizeAlgorithm);
          function pullAlgorithm() {
            return TransformStreamDefaultSourcePullAlgorithm(stream);
          }
          function cancelAlgorithm(reason) {
            TransformStreamErrorWritableAndUnblockWrite(stream, reason);
            return promiseResolvedWith(void 0);
          }
          stream._readable = CreateReadableStream(startAlgorithm, pullAlgorithm, cancelAlgorithm, readableHighWaterMark, readableSizeAlgorithm);
          stream._backpressure = void 0;
          stream._backpressureChangePromise = void 0;
          stream._backpressureChangePromise_resolve = void 0;
          TransformStreamSetBackpressure(stream, true);
          stream._transformStreamController = void 0;
        }
        function IsTransformStream(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_transformStreamController")) {
            return false;
          }
          return x instanceof TransformStream;
        }
        function TransformStreamError(stream, e) {
          ReadableStreamDefaultControllerError(stream._readable._readableStreamController, e);
          TransformStreamErrorWritableAndUnblockWrite(stream, e);
        }
        function TransformStreamErrorWritableAndUnblockWrite(stream, e) {
          TransformStreamDefaultControllerClearAlgorithms(stream._transformStreamController);
          WritableStreamDefaultControllerErrorIfNeeded(stream._writable._writableStreamController, e);
          if (stream._backpressure) {
            TransformStreamSetBackpressure(stream, false);
          }
        }
        function TransformStreamSetBackpressure(stream, backpressure) {
          if (stream._backpressureChangePromise !== void 0) {
            stream._backpressureChangePromise_resolve();
          }
          stream._backpressureChangePromise = newPromise((resolve2) => {
            stream._backpressureChangePromise_resolve = resolve2;
          });
          stream._backpressure = backpressure;
        }
        class TransformStreamDefaultController {
          constructor() {
            throw new TypeError("Illegal constructor");
          }
          get desiredSize() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("desiredSize");
            }
            const readableController = this._controlledTransformStream._readable._readableStreamController;
            return ReadableStreamDefaultControllerGetDesiredSize(readableController);
          }
          enqueue(chunk = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("enqueue");
            }
            TransformStreamDefaultControllerEnqueue(this, chunk);
          }
          error(reason = void 0) {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("error");
            }
            TransformStreamDefaultControllerError(this, reason);
          }
          terminate() {
            if (!IsTransformStreamDefaultController(this)) {
              throw defaultControllerBrandCheckException("terminate");
            }
            TransformStreamDefaultControllerTerminate(this);
          }
        }
        Object.defineProperties(TransformStreamDefaultController.prototype, {
          enqueue: { enumerable: true },
          error: { enumerable: true },
          terminate: { enumerable: true },
          desiredSize: { enumerable: true }
        });
        if (typeof SymbolPolyfill.toStringTag === "symbol") {
          Object.defineProperty(TransformStreamDefaultController.prototype, SymbolPolyfill.toStringTag, {
            value: "TransformStreamDefaultController",
            configurable: true
          });
        }
        function IsTransformStreamDefaultController(x) {
          if (!typeIsObject(x)) {
            return false;
          }
          if (!Object.prototype.hasOwnProperty.call(x, "_controlledTransformStream")) {
            return false;
          }
          return x instanceof TransformStreamDefaultController;
        }
        function SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm) {
          controller._controlledTransformStream = stream;
          stream._transformStreamController = controller;
          controller._transformAlgorithm = transformAlgorithm;
          controller._flushAlgorithm = flushAlgorithm;
        }
        function SetUpTransformStreamDefaultControllerFromTransformer(stream, transformer) {
          const controller = Object.create(TransformStreamDefaultController.prototype);
          let transformAlgorithm = (chunk) => {
            try {
              TransformStreamDefaultControllerEnqueue(controller, chunk);
              return promiseResolvedWith(void 0);
            } catch (transformResultE) {
              return promiseRejectedWith(transformResultE);
            }
          };
          let flushAlgorithm = () => promiseResolvedWith(void 0);
          if (transformer.transform !== void 0) {
            transformAlgorithm = (chunk) => transformer.transform(chunk, controller);
          }
          if (transformer.flush !== void 0) {
            flushAlgorithm = () => transformer.flush(controller);
          }
          SetUpTransformStreamDefaultController(stream, controller, transformAlgorithm, flushAlgorithm);
        }
        function TransformStreamDefaultControllerClearAlgorithms(controller) {
          controller._transformAlgorithm = void 0;
          controller._flushAlgorithm = void 0;
        }
        function TransformStreamDefaultControllerEnqueue(controller, chunk) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          if (!ReadableStreamDefaultControllerCanCloseOrEnqueue(readableController)) {
            throw new TypeError("Readable side is not in a state that permits enqueue");
          }
          try {
            ReadableStreamDefaultControllerEnqueue(readableController, chunk);
          } catch (e) {
            TransformStreamErrorWritableAndUnblockWrite(stream, e);
            throw stream._readable._storedError;
          }
          const backpressure = ReadableStreamDefaultControllerHasBackpressure(readableController);
          if (backpressure !== stream._backpressure) {
            TransformStreamSetBackpressure(stream, true);
          }
        }
        function TransformStreamDefaultControllerError(controller, e) {
          TransformStreamError(controller._controlledTransformStream, e);
        }
        function TransformStreamDefaultControllerPerformTransform(controller, chunk) {
          const transformPromise = controller._transformAlgorithm(chunk);
          return transformPromiseWith(transformPromise, void 0, (r) => {
            TransformStreamError(controller._controlledTransformStream, r);
            throw r;
          });
        }
        function TransformStreamDefaultControllerTerminate(controller) {
          const stream = controller._controlledTransformStream;
          const readableController = stream._readable._readableStreamController;
          ReadableStreamDefaultControllerClose(readableController);
          const error2 = new TypeError("TransformStream terminated");
          TransformStreamErrorWritableAndUnblockWrite(stream, error2);
        }
        function TransformStreamDefaultSinkWriteAlgorithm(stream, chunk) {
          const controller = stream._transformStreamController;
          if (stream._backpressure) {
            const backpressureChangePromise = stream._backpressureChangePromise;
            return transformPromiseWith(backpressureChangePromise, () => {
              const writable2 = stream._writable;
              const state = writable2._state;
              if (state === "erroring") {
                throw writable2._storedError;
              }
              return TransformStreamDefaultControllerPerformTransform(controller, chunk);
            });
          }
          return TransformStreamDefaultControllerPerformTransform(controller, chunk);
        }
        function TransformStreamDefaultSinkAbortAlgorithm(stream, reason) {
          TransformStreamError(stream, reason);
          return promiseResolvedWith(void 0);
        }
        function TransformStreamDefaultSinkCloseAlgorithm(stream) {
          const readable2 = stream._readable;
          const controller = stream._transformStreamController;
          const flushPromise = controller._flushAlgorithm();
          TransformStreamDefaultControllerClearAlgorithms(controller);
          return transformPromiseWith(flushPromise, () => {
            if (readable2._state === "errored") {
              throw readable2._storedError;
            }
            ReadableStreamDefaultControllerClose(readable2._readableStreamController);
          }, (r) => {
            TransformStreamError(stream, r);
            throw readable2._storedError;
          });
        }
        function TransformStreamDefaultSourcePullAlgorithm(stream) {
          TransformStreamSetBackpressure(stream, false);
          return stream._backpressureChangePromise;
        }
        function defaultControllerBrandCheckException(name) {
          return new TypeError(`TransformStreamDefaultController.prototype.${name} can only be used on a TransformStreamDefaultController`);
        }
        function streamBrandCheckException(name) {
          return new TypeError(`TransformStream.prototype.${name} can only be used on a TransformStream`);
        }
        exports3.ByteLengthQueuingStrategy = ByteLengthQueuingStrategy;
        exports3.CountQueuingStrategy = CountQueuingStrategy;
        exports3.ReadableByteStreamController = ReadableByteStreamController;
        exports3.ReadableStream = ReadableStream2;
        exports3.ReadableStreamBYOBReader = ReadableStreamBYOBReader;
        exports3.ReadableStreamBYOBRequest = ReadableStreamBYOBRequest;
        exports3.ReadableStreamDefaultController = ReadableStreamDefaultController;
        exports3.ReadableStreamDefaultReader = ReadableStreamDefaultReader;
        exports3.TransformStream = TransformStream;
        exports3.TransformStreamDefaultController = TransformStreamDefaultController;
        exports3.WritableStream = WritableStream;
        exports3.WritableStreamDefaultController = WritableStreamDefaultController;
        exports3.WritableStreamDefaultWriter = WritableStreamDefaultWriter;
        Object.defineProperty(exports3, "__esModule", { value: true });
      });
    })(ponyfill_es2018, ponyfill_es2018.exports);
    POOL_SIZE$1 = 65536;
    if (!globalThis.ReadableStream) {
      try {
        Object.assign(globalThis, require("stream/web"));
      } catch (error2) {
        Object.assign(globalThis, ponyfill_es2018.exports);
      }
    }
    try {
      const { Blob: Blob3 } = require("buffer");
      if (Blob3 && !Blob3.prototype.stream) {
        Blob3.prototype.stream = function name(params) {
          let position = 0;
          const blob = this;
          return new ReadableStream({
            type: "bytes",
            async pull(ctrl) {
              const chunk = blob.slice(position, Math.min(blob.size, position + POOL_SIZE$1));
              const buffer = await chunk.arrayBuffer();
              position += buffer.byteLength;
              ctrl.enqueue(new Uint8Array(buffer));
              if (position === blob.size) {
                ctrl.close();
              }
            }
          });
        };
      }
    } catch (error2) {
    }
    POOL_SIZE = 65536;
    _Blob = class Blob {
      #parts = [];
      #type = "";
      #size = 0;
      constructor(blobParts = [], options3 = {}) {
        let size = 0;
        const parts = blobParts.map((element) => {
          let part;
          if (ArrayBuffer.isView(element)) {
            part = new Uint8Array(element.buffer.slice(element.byteOffset, element.byteOffset + element.byteLength));
          } else if (element instanceof ArrayBuffer) {
            part = new Uint8Array(element.slice(0));
          } else if (element instanceof Blob) {
            part = element;
          } else {
            part = new TextEncoder().encode(element);
          }
          size += ArrayBuffer.isView(part) ? part.byteLength : part.size;
          return part;
        });
        const type = options3.type === void 0 ? "" : String(options3.type);
        this.#type = /[^\u0020-\u007E]/.test(type) ? "" : type;
        this.#size = size;
        this.#parts = parts;
      }
      get size() {
        return this.#size;
      }
      get type() {
        return this.#type;
      }
      async text() {
        const decoder = new TextDecoder();
        let str = "";
        for await (let part of toIterator(this.#parts, false)) {
          str += decoder.decode(part, { stream: true });
        }
        str += decoder.decode();
        return str;
      }
      async arrayBuffer() {
        const data = new Uint8Array(this.size);
        let offset = 0;
        for await (const chunk of toIterator(this.#parts, false)) {
          data.set(chunk, offset);
          offset += chunk.length;
        }
        return data.buffer;
      }
      stream() {
        const it = toIterator(this.#parts, true);
        return new ReadableStream({
          type: "bytes",
          async pull(ctrl) {
            const chunk = await it.next();
            chunk.done ? ctrl.close() : ctrl.enqueue(chunk.value);
          }
        });
      }
      slice(start = 0, end = this.size, type = "") {
        const { size } = this;
        let relativeStart = start < 0 ? Math.max(size + start, 0) : Math.min(start, size);
        let relativeEnd = end < 0 ? Math.max(size + end, 0) : Math.min(end, size);
        const span = Math.max(relativeEnd - relativeStart, 0);
        const parts = this.#parts;
        const blobParts = [];
        let added = 0;
        for (const part of parts) {
          if (added >= span) {
            break;
          }
          const size2 = ArrayBuffer.isView(part) ? part.byteLength : part.size;
          if (relativeStart && size2 <= relativeStart) {
            relativeStart -= size2;
            relativeEnd -= size2;
          } else {
            let chunk;
            if (ArrayBuffer.isView(part)) {
              chunk = part.subarray(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.byteLength;
            } else {
              chunk = part.slice(relativeStart, Math.min(size2, relativeEnd));
              added += chunk.size;
            }
            blobParts.push(chunk);
            relativeStart = 0;
          }
        }
        const blob = new Blob([], { type: String(type).toLowerCase() });
        blob.#size = span;
        blob.#parts = blobParts;
        return blob;
      }
      get [Symbol.toStringTag]() {
        return "Blob";
      }
      static [Symbol.hasInstance](object) {
        return object && typeof object === "object" && typeof object.constructor === "function" && (typeof object.stream === "function" || typeof object.arrayBuffer === "function") && /^(Blob|File)$/.test(object[Symbol.toStringTag]);
      }
    };
    Object.defineProperties(_Blob.prototype, {
      size: { enumerable: true },
      type: { enumerable: true },
      slice: { enumerable: true }
    });
    Blob2 = _Blob;
    Blob$1 = Blob2;
    FetchBaseError = class extends Error {
      constructor(message, type) {
        super(message);
        Error.captureStackTrace(this, this.constructor);
        this.type = type;
      }
      get name() {
        return this.constructor.name;
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
    };
    FetchError = class extends FetchBaseError {
      constructor(message, type, systemError) {
        super(message, type);
        if (systemError) {
          this.code = this.errno = systemError.code;
          this.erroredSysCall = systemError.syscall;
        }
      }
    };
    NAME = Symbol.toStringTag;
    isURLSearchParameters = (object) => {
      return typeof object === "object" && typeof object.append === "function" && typeof object.delete === "function" && typeof object.get === "function" && typeof object.getAll === "function" && typeof object.has === "function" && typeof object.set === "function" && typeof object.sort === "function" && object[NAME] === "URLSearchParams";
    };
    isBlob = (object) => {
      return typeof object === "object" && typeof object.arrayBuffer === "function" && typeof object.type === "string" && typeof object.stream === "function" && typeof object.constructor === "function" && /^(Blob|File)$/.test(object[NAME]);
    };
    isAbortSignal = (object) => {
      return typeof object === "object" && (object[NAME] === "AbortSignal" || object[NAME] === "EventTarget");
    };
    carriage = "\r\n";
    dashes = "-".repeat(2);
    carriageLength = Buffer.byteLength(carriage);
    getFooter = (boundary) => `${dashes}${boundary}${dashes}${carriage.repeat(2)}`;
    getBoundary = () => (0, import_crypto.randomBytes)(8).toString("hex");
    INTERNALS$2 = Symbol("Body internals");
    Body = class {
      constructor(body, {
        size = 0
      } = {}) {
        let boundary = null;
        if (body === null) {
          body = null;
        } else if (isURLSearchParameters(body)) {
          body = Buffer.from(body.toString());
        } else if (isBlob(body))
          ;
        else if (Buffer.isBuffer(body))
          ;
        else if (import_util.types.isAnyArrayBuffer(body)) {
          body = Buffer.from(body);
        } else if (ArrayBuffer.isView(body)) {
          body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
        } else if (body instanceof import_stream.default)
          ;
        else if (isFormData(body)) {
          boundary = `NodeFetchFormDataBoundary${getBoundary()}`;
          body = import_stream.default.Readable.from(formDataIterator(body, boundary));
        } else {
          body = Buffer.from(String(body));
        }
        this[INTERNALS$2] = {
          body,
          boundary,
          disturbed: false,
          error: null
        };
        this.size = size;
        if (body instanceof import_stream.default) {
          body.on("error", (error_) => {
            const error2 = error_ instanceof FetchBaseError ? error_ : new FetchError(`Invalid response body while trying to fetch ${this.url}: ${error_.message}`, "system", error_);
            this[INTERNALS$2].error = error2;
          });
        }
      }
      get body() {
        return this[INTERNALS$2].body;
      }
      get bodyUsed() {
        return this[INTERNALS$2].disturbed;
      }
      async arrayBuffer() {
        const { buffer, byteOffset, byteLength } = await consumeBody(this);
        return buffer.slice(byteOffset, byteOffset + byteLength);
      }
      async blob() {
        const ct = this.headers && this.headers.get("content-type") || this[INTERNALS$2].body && this[INTERNALS$2].body.type || "";
        const buf = await this.buffer();
        return new Blob$1([buf], {
          type: ct
        });
      }
      async json() {
        const buffer = await consumeBody(this);
        return JSON.parse(buffer.toString());
      }
      async text() {
        const buffer = await consumeBody(this);
        return buffer.toString();
      }
      buffer() {
        return consumeBody(this);
      }
    };
    Object.defineProperties(Body.prototype, {
      body: { enumerable: true },
      bodyUsed: { enumerable: true },
      arrayBuffer: { enumerable: true },
      blob: { enumerable: true },
      json: { enumerable: true },
      text: { enumerable: true }
    });
    clone = (instance, highWaterMark) => {
      let p1;
      let p2;
      let { body } = instance;
      if (instance.bodyUsed) {
        throw new Error("cannot clone body after it is used");
      }
      if (body instanceof import_stream.default && typeof body.getBoundary !== "function") {
        p1 = new import_stream.PassThrough({ highWaterMark });
        p2 = new import_stream.PassThrough({ highWaterMark });
        body.pipe(p1);
        body.pipe(p2);
        instance[INTERNALS$2].body = p1;
        body = p2;
      }
      return body;
    };
    extractContentType = (body, request) => {
      if (body === null) {
        return null;
      }
      if (typeof body === "string") {
        return "text/plain;charset=UTF-8";
      }
      if (isURLSearchParameters(body)) {
        return "application/x-www-form-urlencoded;charset=UTF-8";
      }
      if (isBlob(body)) {
        return body.type || null;
      }
      if (Buffer.isBuffer(body) || import_util.types.isAnyArrayBuffer(body) || ArrayBuffer.isView(body)) {
        return null;
      }
      if (body && typeof body.getBoundary === "function") {
        return `multipart/form-data;boundary=${body.getBoundary()}`;
      }
      if (isFormData(body)) {
        return `multipart/form-data; boundary=${request[INTERNALS$2].boundary}`;
      }
      if (body instanceof import_stream.default) {
        return null;
      }
      return "text/plain;charset=UTF-8";
    };
    getTotalBytes = (request) => {
      const { body } = request;
      if (body === null) {
        return 0;
      }
      if (isBlob(body)) {
        return body.size;
      }
      if (Buffer.isBuffer(body)) {
        return body.length;
      }
      if (body && typeof body.getLengthSync === "function") {
        return body.hasKnownLength && body.hasKnownLength() ? body.getLengthSync() : null;
      }
      if (isFormData(body)) {
        return getFormDataLength(request[INTERNALS$2].boundary);
      }
      return null;
    };
    writeToStream = (dest, { body }) => {
      if (body === null) {
        dest.end();
      } else if (isBlob(body)) {
        import_stream.default.Readable.from(body.stream()).pipe(dest);
      } else if (Buffer.isBuffer(body)) {
        dest.write(body);
        dest.end();
      } else {
        body.pipe(dest);
      }
    };
    validateHeaderName = typeof import_http.default.validateHeaderName === "function" ? import_http.default.validateHeaderName : (name) => {
      if (!/^[\^`\-\w!#$%&'*+.|~]+$/.test(name)) {
        const error2 = new TypeError(`Header name must be a valid HTTP token [${name}]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_HTTP_TOKEN" });
        throw error2;
      }
    };
    validateHeaderValue = typeof import_http.default.validateHeaderValue === "function" ? import_http.default.validateHeaderValue : (name, value) => {
      if (/[^\t\u0020-\u007E\u0080-\u00FF]/.test(value)) {
        const error2 = new TypeError(`Invalid character in header content ["${name}"]`);
        Object.defineProperty(error2, "code", { value: "ERR_INVALID_CHAR" });
        throw error2;
      }
    };
    Headers = class extends URLSearchParams {
      constructor(init2) {
        let result = [];
        if (init2 instanceof Headers) {
          const raw = init2.raw();
          for (const [name, values] of Object.entries(raw)) {
            result.push(...values.map((value) => [name, value]));
          }
        } else if (init2 == null)
          ;
        else if (typeof init2 === "object" && !import_util.types.isBoxedPrimitive(init2)) {
          const method = init2[Symbol.iterator];
          if (method == null) {
            result.push(...Object.entries(init2));
          } else {
            if (typeof method !== "function") {
              throw new TypeError("Header pairs must be iterable");
            }
            result = [...init2].map((pair) => {
              if (typeof pair !== "object" || import_util.types.isBoxedPrimitive(pair)) {
                throw new TypeError("Each header pair must be an iterable object");
              }
              return [...pair];
            }).map((pair) => {
              if (pair.length !== 2) {
                throw new TypeError("Each header pair must be a name/value tuple");
              }
              return [...pair];
            });
          }
        } else {
          throw new TypeError("Failed to construct 'Headers': The provided value is not of type '(sequence<sequence<ByteString>> or record<ByteString, ByteString>)");
        }
        result = result.length > 0 ? result.map(([name, value]) => {
          validateHeaderName(name);
          validateHeaderValue(name, String(value));
          return [String(name).toLowerCase(), String(value)];
        }) : void 0;
        super(result);
        return new Proxy(this, {
          get(target, p, receiver) {
            switch (p) {
              case "append":
              case "set":
                return (name, value) => {
                  validateHeaderName(name);
                  validateHeaderValue(name, String(value));
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase(), String(value));
                };
              case "delete":
              case "has":
              case "getAll":
                return (name) => {
                  validateHeaderName(name);
                  return URLSearchParams.prototype[p].call(target, String(name).toLowerCase());
                };
              case "keys":
                return () => {
                  target.sort();
                  return new Set(URLSearchParams.prototype.keys.call(target)).keys();
                };
              default:
                return Reflect.get(target, p, receiver);
            }
          }
        });
      }
      get [Symbol.toStringTag]() {
        return this.constructor.name;
      }
      toString() {
        return Object.prototype.toString.call(this);
      }
      get(name) {
        const values = this.getAll(name);
        if (values.length === 0) {
          return null;
        }
        let value = values.join(", ");
        if (/^content-encoding$/i.test(name)) {
          value = value.toLowerCase();
        }
        return value;
      }
      forEach(callback, thisArg = void 0) {
        for (const name of this.keys()) {
          Reflect.apply(callback, thisArg, [this.get(name), name, this]);
        }
      }
      *values() {
        for (const name of this.keys()) {
          yield this.get(name);
        }
      }
      *entries() {
        for (const name of this.keys()) {
          yield [name, this.get(name)];
        }
      }
      [Symbol.iterator]() {
        return this.entries();
      }
      raw() {
        return [...this.keys()].reduce((result, key) => {
          result[key] = this.getAll(key);
          return result;
        }, {});
      }
      [Symbol.for("nodejs.util.inspect.custom")]() {
        return [...this.keys()].reduce((result, key) => {
          const values = this.getAll(key);
          if (key === "host") {
            result[key] = values[0];
          } else {
            result[key] = values.length > 1 ? values : values[0];
          }
          return result;
        }, {});
      }
    };
    Object.defineProperties(Headers.prototype, ["get", "entries", "forEach", "values"].reduce((result, property) => {
      result[property] = { enumerable: true };
      return result;
    }, {}));
    redirectStatus = new Set([301, 302, 303, 307, 308]);
    isRedirect = (code) => {
      return redirectStatus.has(code);
    };
    INTERNALS$1 = Symbol("Response internals");
    Response = class extends Body {
      constructor(body = null, options3 = {}) {
        super(body, options3);
        const status = options3.status != null ? options3.status : 200;
        const headers = new Headers(options3.headers);
        if (body !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(body);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        this[INTERNALS$1] = {
          type: "default",
          url: options3.url,
          status,
          statusText: options3.statusText || "",
          headers,
          counter: options3.counter,
          highWaterMark: options3.highWaterMark
        };
      }
      get type() {
        return this[INTERNALS$1].type;
      }
      get url() {
        return this[INTERNALS$1].url || "";
      }
      get status() {
        return this[INTERNALS$1].status;
      }
      get ok() {
        return this[INTERNALS$1].status >= 200 && this[INTERNALS$1].status < 300;
      }
      get redirected() {
        return this[INTERNALS$1].counter > 0;
      }
      get statusText() {
        return this[INTERNALS$1].statusText;
      }
      get headers() {
        return this[INTERNALS$1].headers;
      }
      get highWaterMark() {
        return this[INTERNALS$1].highWaterMark;
      }
      clone() {
        return new Response(clone(this, this.highWaterMark), {
          type: this.type,
          url: this.url,
          status: this.status,
          statusText: this.statusText,
          headers: this.headers,
          ok: this.ok,
          redirected: this.redirected,
          size: this.size
        });
      }
      static redirect(url, status = 302) {
        if (!isRedirect(status)) {
          throw new RangeError('Failed to execute "redirect" on "response": Invalid status code');
        }
        return new Response(null, {
          headers: {
            location: new URL(url).toString()
          },
          status
        });
      }
      static error() {
        const response = new Response(null, { status: 0, statusText: "" });
        response[INTERNALS$1].type = "error";
        return response;
      }
      get [Symbol.toStringTag]() {
        return "Response";
      }
    };
    Object.defineProperties(Response.prototype, {
      type: { enumerable: true },
      url: { enumerable: true },
      status: { enumerable: true },
      ok: { enumerable: true },
      redirected: { enumerable: true },
      statusText: { enumerable: true },
      headers: { enumerable: true },
      clone: { enumerable: true }
    });
    getSearch = (parsedURL) => {
      if (parsedURL.search) {
        return parsedURL.search;
      }
      const lastOffset = parsedURL.href.length - 1;
      const hash2 = parsedURL.hash || (parsedURL.href[lastOffset] === "#" ? "#" : "");
      return parsedURL.href[lastOffset - hash2.length] === "?" ? "?" : "";
    };
    INTERNALS = Symbol("Request internals");
    isRequest = (object) => {
      return typeof object === "object" && typeof object[INTERNALS] === "object";
    };
    Request = class extends Body {
      constructor(input, init2 = {}) {
        let parsedURL;
        if (isRequest(input)) {
          parsedURL = new URL(input.url);
        } else {
          parsedURL = new URL(input);
          input = {};
        }
        let method = init2.method || input.method || "GET";
        method = method.toUpperCase();
        if ((init2.body != null || isRequest(input)) && input.body !== null && (method === "GET" || method === "HEAD")) {
          throw new TypeError("Request with GET/HEAD method cannot have body");
        }
        const inputBody = init2.body ? init2.body : isRequest(input) && input.body !== null ? clone(input) : null;
        super(inputBody, {
          size: init2.size || input.size || 0
        });
        const headers = new Headers(init2.headers || input.headers || {});
        if (inputBody !== null && !headers.has("Content-Type")) {
          const contentType = extractContentType(inputBody, this);
          if (contentType) {
            headers.append("Content-Type", contentType);
          }
        }
        let signal = isRequest(input) ? input.signal : null;
        if ("signal" in init2) {
          signal = init2.signal;
        }
        if (signal != null && !isAbortSignal(signal)) {
          throw new TypeError("Expected signal to be an instanceof AbortSignal or EventTarget");
        }
        this[INTERNALS] = {
          method,
          redirect: init2.redirect || input.redirect || "follow",
          headers,
          parsedURL,
          signal
        };
        this.follow = init2.follow === void 0 ? input.follow === void 0 ? 20 : input.follow : init2.follow;
        this.compress = init2.compress === void 0 ? input.compress === void 0 ? true : input.compress : init2.compress;
        this.counter = init2.counter || input.counter || 0;
        this.agent = init2.agent || input.agent;
        this.highWaterMark = init2.highWaterMark || input.highWaterMark || 16384;
        this.insecureHTTPParser = init2.insecureHTTPParser || input.insecureHTTPParser || false;
      }
      get method() {
        return this[INTERNALS].method;
      }
      get url() {
        return (0, import_url.format)(this[INTERNALS].parsedURL);
      }
      get headers() {
        return this[INTERNALS].headers;
      }
      get redirect() {
        return this[INTERNALS].redirect;
      }
      get signal() {
        return this[INTERNALS].signal;
      }
      clone() {
        return new Request(this);
      }
      get [Symbol.toStringTag]() {
        return "Request";
      }
    };
    Object.defineProperties(Request.prototype, {
      method: { enumerable: true },
      url: { enumerable: true },
      headers: { enumerable: true },
      redirect: { enumerable: true },
      clone: { enumerable: true },
      signal: { enumerable: true }
    });
    getNodeRequestOptions = (request) => {
      const { parsedURL } = request[INTERNALS];
      const headers = new Headers(request[INTERNALS].headers);
      if (!headers.has("Accept")) {
        headers.set("Accept", "*/*");
      }
      let contentLengthValue = null;
      if (request.body === null && /^(post|put)$/i.test(request.method)) {
        contentLengthValue = "0";
      }
      if (request.body !== null) {
        const totalBytes = getTotalBytes(request);
        if (typeof totalBytes === "number" && !Number.isNaN(totalBytes)) {
          contentLengthValue = String(totalBytes);
        }
      }
      if (contentLengthValue) {
        headers.set("Content-Length", contentLengthValue);
      }
      if (!headers.has("User-Agent")) {
        headers.set("User-Agent", "node-fetch");
      }
      if (request.compress && !headers.has("Accept-Encoding")) {
        headers.set("Accept-Encoding", "gzip,deflate,br");
      }
      let { agent } = request;
      if (typeof agent === "function") {
        agent = agent(parsedURL);
      }
      if (!headers.has("Connection") && !agent) {
        headers.set("Connection", "close");
      }
      const search = getSearch(parsedURL);
      const requestOptions = {
        path: parsedURL.pathname + search,
        pathname: parsedURL.pathname,
        hostname: parsedURL.hostname,
        protocol: parsedURL.protocol,
        port: parsedURL.port,
        hash: parsedURL.hash,
        search: parsedURL.search,
        query: parsedURL.query,
        href: parsedURL.href,
        method: request.method,
        headers: headers[Symbol.for("nodejs.util.inspect.custom")](),
        insecureHTTPParser: request.insecureHTTPParser,
        agent
      };
      return requestOptions;
    };
    AbortError = class extends FetchBaseError {
      constructor(message, type = "aborted") {
        super(message, type);
      }
    };
    supportedSchemas = new Set(["data:", "http:", "https:"]);
  }
});

// node_modules/@sveltejs/adapter-netlify/files/shims.js
var init_shims = __esm({
  "node_modules/@sveltejs/adapter-netlify/files/shims.js"() {
    init_install_fetch();
  }
});

// node_modules/cookie/index.js
var require_cookie = __commonJS({
  "node_modules/cookie/index.js"(exports2) {
    init_shims();
    "use strict";
    exports2.parse = parse;
    exports2.serialize = serialize;
    var decode = decodeURIComponent;
    var encode = encodeURIComponent;
    var pairSplitRegExp = /; */;
    var fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
    function parse(str, options3) {
      if (typeof str !== "string") {
        throw new TypeError("argument str must be a string");
      }
      var obj = {};
      var opt = options3 || {};
      var pairs = str.split(pairSplitRegExp);
      var dec = opt.decode || decode;
      for (var i = 0; i < pairs.length; i++) {
        var pair = pairs[i];
        var eq_idx = pair.indexOf("=");
        if (eq_idx < 0) {
          continue;
        }
        var key = pair.substr(0, eq_idx).trim();
        var val = pair.substr(++eq_idx, pair.length).trim();
        if (val[0] == '"') {
          val = val.slice(1, -1);
        }
        if (obj[key] == void 0) {
          obj[key] = tryDecode(val, dec);
        }
      }
      return obj;
    }
    function serialize(name, val, options3) {
      var opt = options3 || {};
      var enc = opt.encode || encode;
      if (typeof enc !== "function") {
        throw new TypeError("option encode is invalid");
      }
      if (!fieldContentRegExp.test(name)) {
        throw new TypeError("argument name is invalid");
      }
      var value = enc(val);
      if (value && !fieldContentRegExp.test(value)) {
        throw new TypeError("argument val is invalid");
      }
      var str = name + "=" + value;
      if (opt.maxAge != null) {
        var maxAge = opt.maxAge - 0;
        if (isNaN(maxAge) || !isFinite(maxAge)) {
          throw new TypeError("option maxAge is invalid");
        }
        str += "; Max-Age=" + Math.floor(maxAge);
      }
      if (opt.domain) {
        if (!fieldContentRegExp.test(opt.domain)) {
          throw new TypeError("option domain is invalid");
        }
        str += "; Domain=" + opt.domain;
      }
      if (opt.path) {
        if (!fieldContentRegExp.test(opt.path)) {
          throw new TypeError("option path is invalid");
        }
        str += "; Path=" + opt.path;
      }
      if (opt.expires) {
        if (typeof opt.expires.toUTCString !== "function") {
          throw new TypeError("option expires is invalid");
        }
        str += "; Expires=" + opt.expires.toUTCString();
      }
      if (opt.httpOnly) {
        str += "; HttpOnly";
      }
      if (opt.secure) {
        str += "; Secure";
      }
      if (opt.sameSite) {
        var sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
        switch (sameSite) {
          case true:
            str += "; SameSite=Strict";
            break;
          case "lax":
            str += "; SameSite=Lax";
            break;
          case "strict":
            str += "; SameSite=Strict";
            break;
          case "none":
            str += "; SameSite=None";
            break;
          default:
            throw new TypeError("option sameSite is invalid");
        }
      }
      return str;
    }
    function tryDecode(str, decode2) {
      try {
        return decode2(str);
      } catch (e) {
        return str;
      }
    }
  }
});

// node_modules/crypto-js/core.js
var require_core = __commonJS({
  "node_modules/crypto-js/core.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory();
      } else if (typeof define === "function" && define.amd) {
        define([], factory);
      } else {
        root.CryptoJS = factory();
      }
    })(exports2, function() {
      var CryptoJS = CryptoJS || function(Math2, undefined2) {
        var crypto;
        if (typeof window !== "undefined" && window.crypto) {
          crypto = window.crypto;
        }
        if (typeof self !== "undefined" && self.crypto) {
          crypto = self.crypto;
        }
        if (typeof globalThis !== "undefined" && globalThis.crypto) {
          crypto = globalThis.crypto;
        }
        if (!crypto && typeof window !== "undefined" && window.msCrypto) {
          crypto = window.msCrypto;
        }
        if (!crypto && typeof global !== "undefined" && global.crypto) {
          crypto = global.crypto;
        }
        if (!crypto && typeof require === "function") {
          try {
            crypto = require("crypto");
          } catch (err) {
          }
        }
        var cryptoSecureRandomInt = function() {
          if (crypto) {
            if (typeof crypto.getRandomValues === "function") {
              try {
                return crypto.getRandomValues(new Uint32Array(1))[0];
              } catch (err) {
              }
            }
            if (typeof crypto.randomBytes === "function") {
              try {
                return crypto.randomBytes(4).readInt32LE();
              } catch (err) {
              }
            }
          }
          throw new Error("Native crypto module could not be used to get secure random number.");
        };
        var create = Object.create || function() {
          function F() {
          }
          return function(obj) {
            var subtype;
            F.prototype = obj;
            subtype = new F();
            F.prototype = null;
            return subtype;
          };
        }();
        var C = {};
        var C_lib = C.lib = {};
        var Base = C_lib.Base = function() {
          return {
            extend: function(overrides) {
              var subtype = create(this);
              if (overrides) {
                subtype.mixIn(overrides);
              }
              if (!subtype.hasOwnProperty("init") || this.init === subtype.init) {
                subtype.init = function() {
                  subtype.$super.init.apply(this, arguments);
                };
              }
              subtype.init.prototype = subtype;
              subtype.$super = this;
              return subtype;
            },
            create: function() {
              var instance = this.extend();
              instance.init.apply(instance, arguments);
              return instance;
            },
            init: function() {
            },
            mixIn: function(properties) {
              for (var propertyName in properties) {
                if (properties.hasOwnProperty(propertyName)) {
                  this[propertyName] = properties[propertyName];
                }
              }
              if (properties.hasOwnProperty("toString")) {
                this.toString = properties.toString;
              }
            },
            clone: function() {
              return this.init.prototype.extend(this);
            }
          };
        }();
        var WordArray = C_lib.WordArray = Base.extend({
          init: function(words, sigBytes) {
            words = this.words = words || [];
            if (sigBytes != undefined2) {
              this.sigBytes = sigBytes;
            } else {
              this.sigBytes = words.length * 4;
            }
          },
          toString: function(encoder) {
            return (encoder || Hex).stringify(this);
          },
          concat: function(wordArray) {
            var thisWords = this.words;
            var thatWords = wordArray.words;
            var thisSigBytes = this.sigBytes;
            var thatSigBytes = wordArray.sigBytes;
            this.clamp();
            if (thisSigBytes % 4) {
              for (var i = 0; i < thatSigBytes; i++) {
                var thatByte = thatWords[i >>> 2] >>> 24 - i % 4 * 8 & 255;
                thisWords[thisSigBytes + i >>> 2] |= thatByte << 24 - (thisSigBytes + i) % 4 * 8;
              }
            } else {
              for (var j = 0; j < thatSigBytes; j += 4) {
                thisWords[thisSigBytes + j >>> 2] = thatWords[j >>> 2];
              }
            }
            this.sigBytes += thatSigBytes;
            return this;
          },
          clamp: function() {
            var words = this.words;
            var sigBytes = this.sigBytes;
            words[sigBytes >>> 2] &= 4294967295 << 32 - sigBytes % 4 * 8;
            words.length = Math2.ceil(sigBytes / 4);
          },
          clone: function() {
            var clone2 = Base.clone.call(this);
            clone2.words = this.words.slice(0);
            return clone2;
          },
          random: function(nBytes) {
            var words = [];
            for (var i = 0; i < nBytes; i += 4) {
              words.push(cryptoSecureRandomInt());
            }
            return new WordArray.init(words, nBytes);
          }
        });
        var C_enc = C.enc = {};
        var Hex = C_enc.Hex = {
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var hexChars = [];
            for (var i = 0; i < sigBytes; i++) {
              var bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
              hexChars.push((bite >>> 4).toString(16));
              hexChars.push((bite & 15).toString(16));
            }
            return hexChars.join("");
          },
          parse: function(hexStr) {
            var hexStrLength = hexStr.length;
            var words = [];
            for (var i = 0; i < hexStrLength; i += 2) {
              words[i >>> 3] |= parseInt(hexStr.substr(i, 2), 16) << 24 - i % 8 * 4;
            }
            return new WordArray.init(words, hexStrLength / 2);
          }
        };
        var Latin1 = C_enc.Latin1 = {
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var latin1Chars = [];
            for (var i = 0; i < sigBytes; i++) {
              var bite = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
              latin1Chars.push(String.fromCharCode(bite));
            }
            return latin1Chars.join("");
          },
          parse: function(latin1Str) {
            var latin1StrLength = latin1Str.length;
            var words = [];
            for (var i = 0; i < latin1StrLength; i++) {
              words[i >>> 2] |= (latin1Str.charCodeAt(i) & 255) << 24 - i % 4 * 8;
            }
            return new WordArray.init(words, latin1StrLength);
          }
        };
        var Utf8 = C_enc.Utf8 = {
          stringify: function(wordArray) {
            try {
              return decodeURIComponent(escape(Latin1.stringify(wordArray)));
            } catch (e) {
              throw new Error("Malformed UTF-8 data");
            }
          },
          parse: function(utf8Str) {
            return Latin1.parse(unescape(encodeURIComponent(utf8Str)));
          }
        };
        var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm = Base.extend({
          reset: function() {
            this._data = new WordArray.init();
            this._nDataBytes = 0;
          },
          _append: function(data) {
            if (typeof data == "string") {
              data = Utf8.parse(data);
            }
            this._data.concat(data);
            this._nDataBytes += data.sigBytes;
          },
          _process: function(doFlush) {
            var processedWords;
            var data = this._data;
            var dataWords = data.words;
            var dataSigBytes = data.sigBytes;
            var blockSize = this.blockSize;
            var blockSizeBytes = blockSize * 4;
            var nBlocksReady = dataSigBytes / blockSizeBytes;
            if (doFlush) {
              nBlocksReady = Math2.ceil(nBlocksReady);
            } else {
              nBlocksReady = Math2.max((nBlocksReady | 0) - this._minBufferSize, 0);
            }
            var nWordsReady = nBlocksReady * blockSize;
            var nBytesReady = Math2.min(nWordsReady * 4, dataSigBytes);
            if (nWordsReady) {
              for (var offset = 0; offset < nWordsReady; offset += blockSize) {
                this._doProcessBlock(dataWords, offset);
              }
              processedWords = dataWords.splice(0, nWordsReady);
              data.sigBytes -= nBytesReady;
            }
            return new WordArray.init(processedWords, nBytesReady);
          },
          clone: function() {
            var clone2 = Base.clone.call(this);
            clone2._data = this._data.clone();
            return clone2;
          },
          _minBufferSize: 0
        });
        var Hasher = C_lib.Hasher = BufferedBlockAlgorithm.extend({
          cfg: Base.extend(),
          init: function(cfg) {
            this.cfg = this.cfg.extend(cfg);
            this.reset();
          },
          reset: function() {
            BufferedBlockAlgorithm.reset.call(this);
            this._doReset();
          },
          update: function(messageUpdate) {
            this._append(messageUpdate);
            this._process();
            return this;
          },
          finalize: function(messageUpdate) {
            if (messageUpdate) {
              this._append(messageUpdate);
            }
            var hash2 = this._doFinalize();
            return hash2;
          },
          blockSize: 512 / 32,
          _createHelper: function(hasher) {
            return function(message, cfg) {
              return new hasher.init(cfg).finalize(message);
            };
          },
          _createHmacHelper: function(hasher) {
            return function(message, key) {
              return new C_algo.HMAC.init(hasher, key).finalize(message);
            };
          }
        });
        var C_algo = C.algo = {};
        return C;
      }(Math);
      return CryptoJS;
    });
  }
});

// node_modules/crypto-js/x64-core.js
var require_x64_core = __commonJS({
  "node_modules/crypto-js/x64-core.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function(undefined2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var X32WordArray = C_lib.WordArray;
        var C_x64 = C.x64 = {};
        var X64Word = C_x64.Word = Base.extend({
          init: function(high, low) {
            this.high = high;
            this.low = low;
          }
        });
        var X64WordArray = C_x64.WordArray = Base.extend({
          init: function(words, sigBytes) {
            words = this.words = words || [];
            if (sigBytes != undefined2) {
              this.sigBytes = sigBytes;
            } else {
              this.sigBytes = words.length * 8;
            }
          },
          toX32: function() {
            var x64Words = this.words;
            var x64WordsLength = x64Words.length;
            var x32Words = [];
            for (var i = 0; i < x64WordsLength; i++) {
              var x64Word = x64Words[i];
              x32Words.push(x64Word.high);
              x32Words.push(x64Word.low);
            }
            return X32WordArray.create(x32Words, this.sigBytes);
          },
          clone: function() {
            var clone2 = Base.clone.call(this);
            var words = clone2.words = this.words.slice(0);
            var wordsLength = words.length;
            for (var i = 0; i < wordsLength; i++) {
              words[i] = words[i].clone();
            }
            return clone2;
          }
        });
      })();
      return CryptoJS;
    });
  }
});

// node_modules/crypto-js/lib-typedarrays.js
var require_lib_typedarrays = __commonJS({
  "node_modules/crypto-js/lib-typedarrays.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        if (typeof ArrayBuffer != "function") {
          return;
        }
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var superInit = WordArray.init;
        var subInit = WordArray.init = function(typedArray) {
          if (typedArray instanceof ArrayBuffer) {
            typedArray = new Uint8Array(typedArray);
          }
          if (typedArray instanceof Int8Array || typeof Uint8ClampedArray !== "undefined" && typedArray instanceof Uint8ClampedArray || typedArray instanceof Int16Array || typedArray instanceof Uint16Array || typedArray instanceof Int32Array || typedArray instanceof Uint32Array || typedArray instanceof Float32Array || typedArray instanceof Float64Array) {
            typedArray = new Uint8Array(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
          }
          if (typedArray instanceof Uint8Array) {
            var typedArrayByteLength = typedArray.byteLength;
            var words = [];
            for (var i = 0; i < typedArrayByteLength; i++) {
              words[i >>> 2] |= typedArray[i] << 24 - i % 4 * 8;
            }
            superInit.call(this, words, typedArrayByteLength);
          } else {
            superInit.apply(this, arguments);
          }
        };
        subInit.prototype = WordArray;
      })();
      return CryptoJS.lib.WordArray;
    });
  }
});

// node_modules/crypto-js/enc-utf16.js
var require_enc_utf16 = __commonJS({
  "node_modules/crypto-js/enc-utf16.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var C_enc = C.enc;
        var Utf16BE = C_enc.Utf16 = C_enc.Utf16BE = {
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var utf16Chars = [];
            for (var i = 0; i < sigBytes; i += 2) {
              var codePoint = words[i >>> 2] >>> 16 - i % 4 * 8 & 65535;
              utf16Chars.push(String.fromCharCode(codePoint));
            }
            return utf16Chars.join("");
          },
          parse: function(utf16Str) {
            var utf16StrLength = utf16Str.length;
            var words = [];
            for (var i = 0; i < utf16StrLength; i++) {
              words[i >>> 1] |= utf16Str.charCodeAt(i) << 16 - i % 2 * 16;
            }
            return WordArray.create(words, utf16StrLength * 2);
          }
        };
        C_enc.Utf16LE = {
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var utf16Chars = [];
            for (var i = 0; i < sigBytes; i += 2) {
              var codePoint = swapEndian(words[i >>> 2] >>> 16 - i % 4 * 8 & 65535);
              utf16Chars.push(String.fromCharCode(codePoint));
            }
            return utf16Chars.join("");
          },
          parse: function(utf16Str) {
            var utf16StrLength = utf16Str.length;
            var words = [];
            for (var i = 0; i < utf16StrLength; i++) {
              words[i >>> 1] |= swapEndian(utf16Str.charCodeAt(i) << 16 - i % 2 * 16);
            }
            return WordArray.create(words, utf16StrLength * 2);
          }
        };
        function swapEndian(word) {
          return word << 8 & 4278255360 | word >>> 8 & 16711935;
        }
      })();
      return CryptoJS.enc.Utf16;
    });
  }
});

// node_modules/crypto-js/enc-base64.js
var require_enc_base64 = __commonJS({
  "node_modules/crypto-js/enc-base64.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var C_enc = C.enc;
        var Base64 = C_enc.Base64 = {
          stringify: function(wordArray) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = this._map;
            wordArray.clamp();
            var base64Chars = [];
            for (var i = 0; i < sigBytes; i += 3) {
              var byte1 = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
              var byte2 = words[i + 1 >>> 2] >>> 24 - (i + 1) % 4 * 8 & 255;
              var byte3 = words[i + 2 >>> 2] >>> 24 - (i + 2) % 4 * 8 & 255;
              var triplet = byte1 << 16 | byte2 << 8 | byte3;
              for (var j = 0; j < 4 && i + j * 0.75 < sigBytes; j++) {
                base64Chars.push(map.charAt(triplet >>> 6 * (3 - j) & 63));
              }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
              while (base64Chars.length % 4) {
                base64Chars.push(paddingChar);
              }
            }
            return base64Chars.join("");
          },
          parse: function(base64Str) {
            var base64StrLength = base64Str.length;
            var map = this._map;
            var reverseMap = this._reverseMap;
            if (!reverseMap) {
              reverseMap = this._reverseMap = [];
              for (var j = 0; j < map.length; j++) {
                reverseMap[map.charCodeAt(j)] = j;
              }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
              var paddingIndex = base64Str.indexOf(paddingChar);
              if (paddingIndex !== -1) {
                base64StrLength = paddingIndex;
              }
            }
            return parseLoop(base64Str, base64StrLength, reverseMap);
          },
          _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
        };
        function parseLoop(base64Str, base64StrLength, reverseMap) {
          var words = [];
          var nBytes = 0;
          for (var i = 0; i < base64StrLength; i++) {
            if (i % 4) {
              var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << i % 4 * 2;
              var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> 6 - i % 4 * 2;
              var bitsCombined = bits1 | bits2;
              words[nBytes >>> 2] |= bitsCombined << 24 - nBytes % 4 * 8;
              nBytes++;
            }
          }
          return WordArray.create(words, nBytes);
        }
      })();
      return CryptoJS.enc.Base64;
    });
  }
});

// node_modules/crypto-js/enc-base64url.js
var require_enc_base64url = __commonJS({
  "node_modules/crypto-js/enc-base64url.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var C_enc = C.enc;
        var Base64url = C_enc.Base64url = {
          stringify: function(wordArray, urlSafe = true) {
            var words = wordArray.words;
            var sigBytes = wordArray.sigBytes;
            var map = urlSafe ? this._safe_map : this._map;
            wordArray.clamp();
            var base64Chars = [];
            for (var i = 0; i < sigBytes; i += 3) {
              var byte1 = words[i >>> 2] >>> 24 - i % 4 * 8 & 255;
              var byte2 = words[i + 1 >>> 2] >>> 24 - (i + 1) % 4 * 8 & 255;
              var byte3 = words[i + 2 >>> 2] >>> 24 - (i + 2) % 4 * 8 & 255;
              var triplet = byte1 << 16 | byte2 << 8 | byte3;
              for (var j = 0; j < 4 && i + j * 0.75 < sigBytes; j++) {
                base64Chars.push(map.charAt(triplet >>> 6 * (3 - j) & 63));
              }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
              while (base64Chars.length % 4) {
                base64Chars.push(paddingChar);
              }
            }
            return base64Chars.join("");
          },
          parse: function(base64Str, urlSafe = true) {
            var base64StrLength = base64Str.length;
            var map = urlSafe ? this._safe_map : this._map;
            var reverseMap = this._reverseMap;
            if (!reverseMap) {
              reverseMap = this._reverseMap = [];
              for (var j = 0; j < map.length; j++) {
                reverseMap[map.charCodeAt(j)] = j;
              }
            }
            var paddingChar = map.charAt(64);
            if (paddingChar) {
              var paddingIndex = base64Str.indexOf(paddingChar);
              if (paddingIndex !== -1) {
                base64StrLength = paddingIndex;
              }
            }
            return parseLoop(base64Str, base64StrLength, reverseMap);
          },
          _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
          _safe_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
        };
        function parseLoop(base64Str, base64StrLength, reverseMap) {
          var words = [];
          var nBytes = 0;
          for (var i = 0; i < base64StrLength; i++) {
            if (i % 4) {
              var bits1 = reverseMap[base64Str.charCodeAt(i - 1)] << i % 4 * 2;
              var bits2 = reverseMap[base64Str.charCodeAt(i)] >>> 6 - i % 4 * 2;
              var bitsCombined = bits1 | bits2;
              words[nBytes >>> 2] |= bitsCombined << 24 - nBytes % 4 * 8;
              nBytes++;
            }
          }
          return WordArray.create(words, nBytes);
        }
      })();
      return CryptoJS.enc.Base64url;
    });
  }
});

// node_modules/crypto-js/md5.js
var require_md5 = __commonJS({
  "node_modules/crypto-js/md5.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function(Math2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var Hasher = C_lib.Hasher;
        var C_algo = C.algo;
        var T = [];
        (function() {
          for (var i = 0; i < 64; i++) {
            T[i] = Math2.abs(Math2.sin(i + 1)) * 4294967296 | 0;
          }
        })();
        var MD5 = C_algo.MD5 = Hasher.extend({
          _doReset: function() {
            this._hash = new WordArray.init([
              1732584193,
              4023233417,
              2562383102,
              271733878
            ]);
          },
          _doProcessBlock: function(M, offset) {
            for (var i = 0; i < 16; i++) {
              var offset_i = offset + i;
              var M_offset_i = M[offset_i];
              M[offset_i] = (M_offset_i << 8 | M_offset_i >>> 24) & 16711935 | (M_offset_i << 24 | M_offset_i >>> 8) & 4278255360;
            }
            var H = this._hash.words;
            var M_offset_0 = M[offset + 0];
            var M_offset_1 = M[offset + 1];
            var M_offset_2 = M[offset + 2];
            var M_offset_3 = M[offset + 3];
            var M_offset_4 = M[offset + 4];
            var M_offset_5 = M[offset + 5];
            var M_offset_6 = M[offset + 6];
            var M_offset_7 = M[offset + 7];
            var M_offset_8 = M[offset + 8];
            var M_offset_9 = M[offset + 9];
            var M_offset_10 = M[offset + 10];
            var M_offset_11 = M[offset + 11];
            var M_offset_12 = M[offset + 12];
            var M_offset_13 = M[offset + 13];
            var M_offset_14 = M[offset + 14];
            var M_offset_15 = M[offset + 15];
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d2 = H[3];
            a = FF(a, b, c, d2, M_offset_0, 7, T[0]);
            d2 = FF(d2, a, b, c, M_offset_1, 12, T[1]);
            c = FF(c, d2, a, b, M_offset_2, 17, T[2]);
            b = FF(b, c, d2, a, M_offset_3, 22, T[3]);
            a = FF(a, b, c, d2, M_offset_4, 7, T[4]);
            d2 = FF(d2, a, b, c, M_offset_5, 12, T[5]);
            c = FF(c, d2, a, b, M_offset_6, 17, T[6]);
            b = FF(b, c, d2, a, M_offset_7, 22, T[7]);
            a = FF(a, b, c, d2, M_offset_8, 7, T[8]);
            d2 = FF(d2, a, b, c, M_offset_9, 12, T[9]);
            c = FF(c, d2, a, b, M_offset_10, 17, T[10]);
            b = FF(b, c, d2, a, M_offset_11, 22, T[11]);
            a = FF(a, b, c, d2, M_offset_12, 7, T[12]);
            d2 = FF(d2, a, b, c, M_offset_13, 12, T[13]);
            c = FF(c, d2, a, b, M_offset_14, 17, T[14]);
            b = FF(b, c, d2, a, M_offset_15, 22, T[15]);
            a = GG(a, b, c, d2, M_offset_1, 5, T[16]);
            d2 = GG(d2, a, b, c, M_offset_6, 9, T[17]);
            c = GG(c, d2, a, b, M_offset_11, 14, T[18]);
            b = GG(b, c, d2, a, M_offset_0, 20, T[19]);
            a = GG(a, b, c, d2, M_offset_5, 5, T[20]);
            d2 = GG(d2, a, b, c, M_offset_10, 9, T[21]);
            c = GG(c, d2, a, b, M_offset_15, 14, T[22]);
            b = GG(b, c, d2, a, M_offset_4, 20, T[23]);
            a = GG(a, b, c, d2, M_offset_9, 5, T[24]);
            d2 = GG(d2, a, b, c, M_offset_14, 9, T[25]);
            c = GG(c, d2, a, b, M_offset_3, 14, T[26]);
            b = GG(b, c, d2, a, M_offset_8, 20, T[27]);
            a = GG(a, b, c, d2, M_offset_13, 5, T[28]);
            d2 = GG(d2, a, b, c, M_offset_2, 9, T[29]);
            c = GG(c, d2, a, b, M_offset_7, 14, T[30]);
            b = GG(b, c, d2, a, M_offset_12, 20, T[31]);
            a = HH(a, b, c, d2, M_offset_5, 4, T[32]);
            d2 = HH(d2, a, b, c, M_offset_8, 11, T[33]);
            c = HH(c, d2, a, b, M_offset_11, 16, T[34]);
            b = HH(b, c, d2, a, M_offset_14, 23, T[35]);
            a = HH(a, b, c, d2, M_offset_1, 4, T[36]);
            d2 = HH(d2, a, b, c, M_offset_4, 11, T[37]);
            c = HH(c, d2, a, b, M_offset_7, 16, T[38]);
            b = HH(b, c, d2, a, M_offset_10, 23, T[39]);
            a = HH(a, b, c, d2, M_offset_13, 4, T[40]);
            d2 = HH(d2, a, b, c, M_offset_0, 11, T[41]);
            c = HH(c, d2, a, b, M_offset_3, 16, T[42]);
            b = HH(b, c, d2, a, M_offset_6, 23, T[43]);
            a = HH(a, b, c, d2, M_offset_9, 4, T[44]);
            d2 = HH(d2, a, b, c, M_offset_12, 11, T[45]);
            c = HH(c, d2, a, b, M_offset_15, 16, T[46]);
            b = HH(b, c, d2, a, M_offset_2, 23, T[47]);
            a = II(a, b, c, d2, M_offset_0, 6, T[48]);
            d2 = II(d2, a, b, c, M_offset_7, 10, T[49]);
            c = II(c, d2, a, b, M_offset_14, 15, T[50]);
            b = II(b, c, d2, a, M_offset_5, 21, T[51]);
            a = II(a, b, c, d2, M_offset_12, 6, T[52]);
            d2 = II(d2, a, b, c, M_offset_3, 10, T[53]);
            c = II(c, d2, a, b, M_offset_10, 15, T[54]);
            b = II(b, c, d2, a, M_offset_1, 21, T[55]);
            a = II(a, b, c, d2, M_offset_8, 6, T[56]);
            d2 = II(d2, a, b, c, M_offset_15, 10, T[57]);
            c = II(c, d2, a, b, M_offset_6, 15, T[58]);
            b = II(b, c, d2, a, M_offset_13, 21, T[59]);
            a = II(a, b, c, d2, M_offset_4, 6, T[60]);
            d2 = II(d2, a, b, c, M_offset_11, 10, T[61]);
            c = II(c, d2, a, b, M_offset_2, 15, T[62]);
            b = II(b, c, d2, a, M_offset_9, 21, T[63]);
            H[0] = H[0] + a | 0;
            H[1] = H[1] + b | 0;
            H[2] = H[2] + c | 0;
            H[3] = H[3] + d2 | 0;
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
            var nBitsTotalH = Math2.floor(nBitsTotal / 4294967296);
            var nBitsTotalL = nBitsTotal;
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = (nBitsTotalH << 8 | nBitsTotalH >>> 24) & 16711935 | (nBitsTotalH << 24 | nBitsTotalH >>> 8) & 4278255360;
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = (nBitsTotalL << 8 | nBitsTotalL >>> 24) & 16711935 | (nBitsTotalL << 24 | nBitsTotalL >>> 8) & 4278255360;
            data.sigBytes = (dataWords.length + 1) * 4;
            this._process();
            var hash2 = this._hash;
            var H = hash2.words;
            for (var i = 0; i < 4; i++) {
              var H_i = H[i];
              H[i] = (H_i << 8 | H_i >>> 24) & 16711935 | (H_i << 24 | H_i >>> 8) & 4278255360;
            }
            return hash2;
          },
          clone: function() {
            var clone2 = Hasher.clone.call(this);
            clone2._hash = this._hash.clone();
            return clone2;
          }
        });
        function FF(a, b, c, d2, x, s2, t) {
          var n = a + (b & c | ~b & d2) + x + t;
          return (n << s2 | n >>> 32 - s2) + b;
        }
        function GG(a, b, c, d2, x, s2, t) {
          var n = a + (b & d2 | c & ~d2) + x + t;
          return (n << s2 | n >>> 32 - s2) + b;
        }
        function HH(a, b, c, d2, x, s2, t) {
          var n = a + (b ^ c ^ d2) + x + t;
          return (n << s2 | n >>> 32 - s2) + b;
        }
        function II(a, b, c, d2, x, s2, t) {
          var n = a + (c ^ (b | ~d2)) + x + t;
          return (n << s2 | n >>> 32 - s2) + b;
        }
        C.MD5 = Hasher._createHelper(MD5);
        C.HmacMD5 = Hasher._createHmacHelper(MD5);
      })(Math);
      return CryptoJS.MD5;
    });
  }
});

// node_modules/crypto-js/sha1.js
var require_sha1 = __commonJS({
  "node_modules/crypto-js/sha1.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var Hasher = C_lib.Hasher;
        var C_algo = C.algo;
        var W = [];
        var SHA1 = C_algo.SHA1 = Hasher.extend({
          _doReset: function() {
            this._hash = new WordArray.init([
              1732584193,
              4023233417,
              2562383102,
              271733878,
              3285377520
            ]);
          },
          _doProcessBlock: function(M, offset) {
            var H = this._hash.words;
            var a = H[0];
            var b = H[1];
            var c = H[2];
            var d2 = H[3];
            var e = H[4];
            for (var i = 0; i < 80; i++) {
              if (i < 16) {
                W[i] = M[offset + i] | 0;
              } else {
                var n = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
                W[i] = n << 1 | n >>> 31;
              }
              var t = (a << 5 | a >>> 27) + e + W[i];
              if (i < 20) {
                t += (b & c | ~b & d2) + 1518500249;
              } else if (i < 40) {
                t += (b ^ c ^ d2) + 1859775393;
              } else if (i < 60) {
                t += (b & c | b & d2 | c & d2) - 1894007588;
              } else {
                t += (b ^ c ^ d2) - 899497514;
              }
              e = d2;
              d2 = c;
              c = b << 30 | b >>> 2;
              b = a;
              a = t;
            }
            H[0] = H[0] + a | 0;
            H[1] = H[1] + b | 0;
            H[2] = H[2] + c | 0;
            H[3] = H[3] + d2 | 0;
            H[4] = H[4] + e | 0;
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math.floor(nBitsTotal / 4294967296);
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;
            this._process();
            return this._hash;
          },
          clone: function() {
            var clone2 = Hasher.clone.call(this);
            clone2._hash = this._hash.clone();
            return clone2;
          }
        });
        C.SHA1 = Hasher._createHelper(SHA1);
        C.HmacSHA1 = Hasher._createHmacHelper(SHA1);
      })();
      return CryptoJS.SHA1;
    });
  }
});

// node_modules/crypto-js/sha256.js
var require_sha256 = __commonJS({
  "node_modules/crypto-js/sha256.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function(Math2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var Hasher = C_lib.Hasher;
        var C_algo = C.algo;
        var H = [];
        var K = [];
        (function() {
          function isPrime(n2) {
            var sqrtN = Math2.sqrt(n2);
            for (var factor = 2; factor <= sqrtN; factor++) {
              if (!(n2 % factor)) {
                return false;
              }
            }
            return true;
          }
          function getFractionalBits(n2) {
            return (n2 - (n2 | 0)) * 4294967296 | 0;
          }
          var n = 2;
          var nPrime = 0;
          while (nPrime < 64) {
            if (isPrime(n)) {
              if (nPrime < 8) {
                H[nPrime] = getFractionalBits(Math2.pow(n, 1 / 2));
              }
              K[nPrime] = getFractionalBits(Math2.pow(n, 1 / 3));
              nPrime++;
            }
            n++;
          }
        })();
        var W = [];
        var SHA256 = C_algo.SHA256 = Hasher.extend({
          _doReset: function() {
            this._hash = new WordArray.init(H.slice(0));
          },
          _doProcessBlock: function(M, offset) {
            var H2 = this._hash.words;
            var a = H2[0];
            var b = H2[1];
            var c = H2[2];
            var d2 = H2[3];
            var e = H2[4];
            var f = H2[5];
            var g = H2[6];
            var h = H2[7];
            for (var i = 0; i < 64; i++) {
              if (i < 16) {
                W[i] = M[offset + i] | 0;
              } else {
                var gamma0x = W[i - 15];
                var gamma0 = (gamma0x << 25 | gamma0x >>> 7) ^ (gamma0x << 14 | gamma0x >>> 18) ^ gamma0x >>> 3;
                var gamma1x = W[i - 2];
                var gamma1 = (gamma1x << 15 | gamma1x >>> 17) ^ (gamma1x << 13 | gamma1x >>> 19) ^ gamma1x >>> 10;
                W[i] = gamma0 + W[i - 7] + gamma1 + W[i - 16];
              }
              var ch = e & f ^ ~e & g;
              var maj = a & b ^ a & c ^ b & c;
              var sigma0 = (a << 30 | a >>> 2) ^ (a << 19 | a >>> 13) ^ (a << 10 | a >>> 22);
              var sigma1 = (e << 26 | e >>> 6) ^ (e << 21 | e >>> 11) ^ (e << 7 | e >>> 25);
              var t1 = h + sigma1 + ch + K[i] + W[i];
              var t2 = sigma0 + maj;
              h = g;
              g = f;
              f = e;
              e = d2 + t1 | 0;
              d2 = c;
              c = b;
              b = a;
              a = t1 + t2 | 0;
            }
            H2[0] = H2[0] + a | 0;
            H2[1] = H2[1] + b | 0;
            H2[2] = H2[2] + c | 0;
            H2[3] = H2[3] + d2 | 0;
            H2[4] = H2[4] + e | 0;
            H2[5] = H2[5] + f | 0;
            H2[6] = H2[6] + g | 0;
            H2[7] = H2[7] + h | 0;
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = Math2.floor(nBitsTotal / 4294967296);
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 15] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;
            this._process();
            return this._hash;
          },
          clone: function() {
            var clone2 = Hasher.clone.call(this);
            clone2._hash = this._hash.clone();
            return clone2;
          }
        });
        C.SHA256 = Hasher._createHelper(SHA256);
        C.HmacSHA256 = Hasher._createHmacHelper(SHA256);
      })(Math);
      return CryptoJS.SHA256;
    });
  }
});

// node_modules/crypto-js/sha224.js
var require_sha224 = __commonJS({
  "node_modules/crypto-js/sha224.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_sha256());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./sha256"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var C_algo = C.algo;
        var SHA256 = C_algo.SHA256;
        var SHA224 = C_algo.SHA224 = SHA256.extend({
          _doReset: function() {
            this._hash = new WordArray.init([
              3238371032,
              914150663,
              812702999,
              4144912697,
              4290775857,
              1750603025,
              1694076839,
              3204075428
            ]);
          },
          _doFinalize: function() {
            var hash2 = SHA256._doFinalize.call(this);
            hash2.sigBytes -= 4;
            return hash2;
          }
        });
        C.SHA224 = SHA256._createHelper(SHA224);
        C.HmacSHA224 = SHA256._createHmacHelper(SHA224);
      })();
      return CryptoJS.SHA224;
    });
  }
});

// node_modules/crypto-js/sha512.js
var require_sha512 = __commonJS({
  "node_modules/crypto-js/sha512.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_x64_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./x64-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Hasher = C_lib.Hasher;
        var C_x64 = C.x64;
        var X64Word = C_x64.Word;
        var X64WordArray = C_x64.WordArray;
        var C_algo = C.algo;
        function X64Word_create() {
          return X64Word.create.apply(X64Word, arguments);
        }
        var K = [
          X64Word_create(1116352408, 3609767458),
          X64Word_create(1899447441, 602891725),
          X64Word_create(3049323471, 3964484399),
          X64Word_create(3921009573, 2173295548),
          X64Word_create(961987163, 4081628472),
          X64Word_create(1508970993, 3053834265),
          X64Word_create(2453635748, 2937671579),
          X64Word_create(2870763221, 3664609560),
          X64Word_create(3624381080, 2734883394),
          X64Word_create(310598401, 1164996542),
          X64Word_create(607225278, 1323610764),
          X64Word_create(1426881987, 3590304994),
          X64Word_create(1925078388, 4068182383),
          X64Word_create(2162078206, 991336113),
          X64Word_create(2614888103, 633803317),
          X64Word_create(3248222580, 3479774868),
          X64Word_create(3835390401, 2666613458),
          X64Word_create(4022224774, 944711139),
          X64Word_create(264347078, 2341262773),
          X64Word_create(604807628, 2007800933),
          X64Word_create(770255983, 1495990901),
          X64Word_create(1249150122, 1856431235),
          X64Word_create(1555081692, 3175218132),
          X64Word_create(1996064986, 2198950837),
          X64Word_create(2554220882, 3999719339),
          X64Word_create(2821834349, 766784016),
          X64Word_create(2952996808, 2566594879),
          X64Word_create(3210313671, 3203337956),
          X64Word_create(3336571891, 1034457026),
          X64Word_create(3584528711, 2466948901),
          X64Word_create(113926993, 3758326383),
          X64Word_create(338241895, 168717936),
          X64Word_create(666307205, 1188179964),
          X64Word_create(773529912, 1546045734),
          X64Word_create(1294757372, 1522805485),
          X64Word_create(1396182291, 2643833823),
          X64Word_create(1695183700, 2343527390),
          X64Word_create(1986661051, 1014477480),
          X64Word_create(2177026350, 1206759142),
          X64Word_create(2456956037, 344077627),
          X64Word_create(2730485921, 1290863460),
          X64Word_create(2820302411, 3158454273),
          X64Word_create(3259730800, 3505952657),
          X64Word_create(3345764771, 106217008),
          X64Word_create(3516065817, 3606008344),
          X64Word_create(3600352804, 1432725776),
          X64Word_create(4094571909, 1467031594),
          X64Word_create(275423344, 851169720),
          X64Word_create(430227734, 3100823752),
          X64Word_create(506948616, 1363258195),
          X64Word_create(659060556, 3750685593),
          X64Word_create(883997877, 3785050280),
          X64Word_create(958139571, 3318307427),
          X64Word_create(1322822218, 3812723403),
          X64Word_create(1537002063, 2003034995),
          X64Word_create(1747873779, 3602036899),
          X64Word_create(1955562222, 1575990012),
          X64Word_create(2024104815, 1125592928),
          X64Word_create(2227730452, 2716904306),
          X64Word_create(2361852424, 442776044),
          X64Word_create(2428436474, 593698344),
          X64Word_create(2756734187, 3733110249),
          X64Word_create(3204031479, 2999351573),
          X64Word_create(3329325298, 3815920427),
          X64Word_create(3391569614, 3928383900),
          X64Word_create(3515267271, 566280711),
          X64Word_create(3940187606, 3454069534),
          X64Word_create(4118630271, 4000239992),
          X64Word_create(116418474, 1914138554),
          X64Word_create(174292421, 2731055270),
          X64Word_create(289380356, 3203993006),
          X64Word_create(460393269, 320620315),
          X64Word_create(685471733, 587496836),
          X64Word_create(852142971, 1086792851),
          X64Word_create(1017036298, 365543100),
          X64Word_create(1126000580, 2618297676),
          X64Word_create(1288033470, 3409855158),
          X64Word_create(1501505948, 4234509866),
          X64Word_create(1607167915, 987167468),
          X64Word_create(1816402316, 1246189591)
        ];
        var W = [];
        (function() {
          for (var i = 0; i < 80; i++) {
            W[i] = X64Word_create();
          }
        })();
        var SHA512 = C_algo.SHA512 = Hasher.extend({
          _doReset: function() {
            this._hash = new X64WordArray.init([
              new X64Word.init(1779033703, 4089235720),
              new X64Word.init(3144134277, 2227873595),
              new X64Word.init(1013904242, 4271175723),
              new X64Word.init(2773480762, 1595750129),
              new X64Word.init(1359893119, 2917565137),
              new X64Word.init(2600822924, 725511199),
              new X64Word.init(528734635, 4215389547),
              new X64Word.init(1541459225, 327033209)
            ]);
          },
          _doProcessBlock: function(M, offset) {
            var H = this._hash.words;
            var H0 = H[0];
            var H1 = H[1];
            var H2 = H[2];
            var H3 = H[3];
            var H4 = H[4];
            var H5 = H[5];
            var H6 = H[6];
            var H7 = H[7];
            var H0h = H0.high;
            var H0l = H0.low;
            var H1h = H1.high;
            var H1l = H1.low;
            var H2h = H2.high;
            var H2l = H2.low;
            var H3h = H3.high;
            var H3l = H3.low;
            var H4h = H4.high;
            var H4l = H4.low;
            var H5h = H5.high;
            var H5l = H5.low;
            var H6h = H6.high;
            var H6l = H6.low;
            var H7h = H7.high;
            var H7l = H7.low;
            var ah = H0h;
            var al = H0l;
            var bh = H1h;
            var bl = H1l;
            var ch = H2h;
            var cl = H2l;
            var dh = H3h;
            var dl = H3l;
            var eh = H4h;
            var el = H4l;
            var fh = H5h;
            var fl = H5l;
            var gh = H6h;
            var gl = H6l;
            var hh = H7h;
            var hl = H7l;
            for (var i = 0; i < 80; i++) {
              var Wil;
              var Wih;
              var Wi = W[i];
              if (i < 16) {
                Wih = Wi.high = M[offset + i * 2] | 0;
                Wil = Wi.low = M[offset + i * 2 + 1] | 0;
              } else {
                var gamma0x = W[i - 15];
                var gamma0xh = gamma0x.high;
                var gamma0xl = gamma0x.low;
                var gamma0h = (gamma0xh >>> 1 | gamma0xl << 31) ^ (gamma0xh >>> 8 | gamma0xl << 24) ^ gamma0xh >>> 7;
                var gamma0l = (gamma0xl >>> 1 | gamma0xh << 31) ^ (gamma0xl >>> 8 | gamma0xh << 24) ^ (gamma0xl >>> 7 | gamma0xh << 25);
                var gamma1x = W[i - 2];
                var gamma1xh = gamma1x.high;
                var gamma1xl = gamma1x.low;
                var gamma1h = (gamma1xh >>> 19 | gamma1xl << 13) ^ (gamma1xh << 3 | gamma1xl >>> 29) ^ gamma1xh >>> 6;
                var gamma1l = (gamma1xl >>> 19 | gamma1xh << 13) ^ (gamma1xl << 3 | gamma1xh >>> 29) ^ (gamma1xl >>> 6 | gamma1xh << 26);
                var Wi7 = W[i - 7];
                var Wi7h = Wi7.high;
                var Wi7l = Wi7.low;
                var Wi16 = W[i - 16];
                var Wi16h = Wi16.high;
                var Wi16l = Wi16.low;
                Wil = gamma0l + Wi7l;
                Wih = gamma0h + Wi7h + (Wil >>> 0 < gamma0l >>> 0 ? 1 : 0);
                Wil = Wil + gamma1l;
                Wih = Wih + gamma1h + (Wil >>> 0 < gamma1l >>> 0 ? 1 : 0);
                Wil = Wil + Wi16l;
                Wih = Wih + Wi16h + (Wil >>> 0 < Wi16l >>> 0 ? 1 : 0);
                Wi.high = Wih;
                Wi.low = Wil;
              }
              var chh = eh & fh ^ ~eh & gh;
              var chl = el & fl ^ ~el & gl;
              var majh = ah & bh ^ ah & ch ^ bh & ch;
              var majl = al & bl ^ al & cl ^ bl & cl;
              var sigma0h = (ah >>> 28 | al << 4) ^ (ah << 30 | al >>> 2) ^ (ah << 25 | al >>> 7);
              var sigma0l = (al >>> 28 | ah << 4) ^ (al << 30 | ah >>> 2) ^ (al << 25 | ah >>> 7);
              var sigma1h = (eh >>> 14 | el << 18) ^ (eh >>> 18 | el << 14) ^ (eh << 23 | el >>> 9);
              var sigma1l = (el >>> 14 | eh << 18) ^ (el >>> 18 | eh << 14) ^ (el << 23 | eh >>> 9);
              var Ki = K[i];
              var Kih = Ki.high;
              var Kil = Ki.low;
              var t1l = hl + sigma1l;
              var t1h = hh + sigma1h + (t1l >>> 0 < hl >>> 0 ? 1 : 0);
              var t1l = t1l + chl;
              var t1h = t1h + chh + (t1l >>> 0 < chl >>> 0 ? 1 : 0);
              var t1l = t1l + Kil;
              var t1h = t1h + Kih + (t1l >>> 0 < Kil >>> 0 ? 1 : 0);
              var t1l = t1l + Wil;
              var t1h = t1h + Wih + (t1l >>> 0 < Wil >>> 0 ? 1 : 0);
              var t2l = sigma0l + majl;
              var t2h = sigma0h + majh + (t2l >>> 0 < sigma0l >>> 0 ? 1 : 0);
              hh = gh;
              hl = gl;
              gh = fh;
              gl = fl;
              fh = eh;
              fl = el;
              el = dl + t1l | 0;
              eh = dh + t1h + (el >>> 0 < dl >>> 0 ? 1 : 0) | 0;
              dh = ch;
              dl = cl;
              ch = bh;
              cl = bl;
              bh = ah;
              bl = al;
              al = t1l + t2l | 0;
              ah = t1h + t2h + (al >>> 0 < t1l >>> 0 ? 1 : 0) | 0;
            }
            H0l = H0.low = H0l + al;
            H0.high = H0h + ah + (H0l >>> 0 < al >>> 0 ? 1 : 0);
            H1l = H1.low = H1l + bl;
            H1.high = H1h + bh + (H1l >>> 0 < bl >>> 0 ? 1 : 0);
            H2l = H2.low = H2l + cl;
            H2.high = H2h + ch + (H2l >>> 0 < cl >>> 0 ? 1 : 0);
            H3l = H3.low = H3l + dl;
            H3.high = H3h + dh + (H3l >>> 0 < dl >>> 0 ? 1 : 0);
            H4l = H4.low = H4l + el;
            H4.high = H4h + eh + (H4l >>> 0 < el >>> 0 ? 1 : 0);
            H5l = H5.low = H5l + fl;
            H5.high = H5h + fh + (H5l >>> 0 < fl >>> 0 ? 1 : 0);
            H6l = H6.low = H6l + gl;
            H6.high = H6h + gh + (H6l >>> 0 < gl >>> 0 ? 1 : 0);
            H7l = H7.low = H7l + hl;
            H7.high = H7h + hh + (H7l >>> 0 < hl >>> 0 ? 1 : 0);
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
            dataWords[(nBitsLeft + 128 >>> 10 << 5) + 30] = Math.floor(nBitsTotal / 4294967296);
            dataWords[(nBitsLeft + 128 >>> 10 << 5) + 31] = nBitsTotal;
            data.sigBytes = dataWords.length * 4;
            this._process();
            var hash2 = this._hash.toX32();
            return hash2;
          },
          clone: function() {
            var clone2 = Hasher.clone.call(this);
            clone2._hash = this._hash.clone();
            return clone2;
          },
          blockSize: 1024 / 32
        });
        C.SHA512 = Hasher._createHelper(SHA512);
        C.HmacSHA512 = Hasher._createHmacHelper(SHA512);
      })();
      return CryptoJS.SHA512;
    });
  }
});

// node_modules/crypto-js/sha384.js
var require_sha384 = __commonJS({
  "node_modules/crypto-js/sha384.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_x64_core(), require_sha512());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./x64-core", "./sha512"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_x64 = C.x64;
        var X64Word = C_x64.Word;
        var X64WordArray = C_x64.WordArray;
        var C_algo = C.algo;
        var SHA512 = C_algo.SHA512;
        var SHA384 = C_algo.SHA384 = SHA512.extend({
          _doReset: function() {
            this._hash = new X64WordArray.init([
              new X64Word.init(3418070365, 3238371032),
              new X64Word.init(1654270250, 914150663),
              new X64Word.init(2438529370, 812702999),
              new X64Word.init(355462360, 4144912697),
              new X64Word.init(1731405415, 4290775857),
              new X64Word.init(2394180231, 1750603025),
              new X64Word.init(3675008525, 1694076839),
              new X64Word.init(1203062813, 3204075428)
            ]);
          },
          _doFinalize: function() {
            var hash2 = SHA512._doFinalize.call(this);
            hash2.sigBytes -= 16;
            return hash2;
          }
        });
        C.SHA384 = SHA512._createHelper(SHA384);
        C.HmacSHA384 = SHA512._createHmacHelper(SHA384);
      })();
      return CryptoJS.SHA384;
    });
  }
});

// node_modules/crypto-js/sha3.js
var require_sha3 = __commonJS({
  "node_modules/crypto-js/sha3.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_x64_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./x64-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function(Math2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var Hasher = C_lib.Hasher;
        var C_x64 = C.x64;
        var X64Word = C_x64.Word;
        var C_algo = C.algo;
        var RHO_OFFSETS = [];
        var PI_INDEXES = [];
        var ROUND_CONSTANTS = [];
        (function() {
          var x = 1, y = 0;
          for (var t = 0; t < 24; t++) {
            RHO_OFFSETS[x + 5 * y] = (t + 1) * (t + 2) / 2 % 64;
            var newX = y % 5;
            var newY = (2 * x + 3 * y) % 5;
            x = newX;
            y = newY;
          }
          for (var x = 0; x < 5; x++) {
            for (var y = 0; y < 5; y++) {
              PI_INDEXES[x + 5 * y] = y + (2 * x + 3 * y) % 5 * 5;
            }
          }
          var LFSR = 1;
          for (var i = 0; i < 24; i++) {
            var roundConstantMsw = 0;
            var roundConstantLsw = 0;
            for (var j = 0; j < 7; j++) {
              if (LFSR & 1) {
                var bitPosition = (1 << j) - 1;
                if (bitPosition < 32) {
                  roundConstantLsw ^= 1 << bitPosition;
                } else {
                  roundConstantMsw ^= 1 << bitPosition - 32;
                }
              }
              if (LFSR & 128) {
                LFSR = LFSR << 1 ^ 113;
              } else {
                LFSR <<= 1;
              }
            }
            ROUND_CONSTANTS[i] = X64Word.create(roundConstantMsw, roundConstantLsw);
          }
        })();
        var T = [];
        (function() {
          for (var i = 0; i < 25; i++) {
            T[i] = X64Word.create();
          }
        })();
        var SHA3 = C_algo.SHA3 = Hasher.extend({
          cfg: Hasher.cfg.extend({
            outputLength: 512
          }),
          _doReset: function() {
            var state = this._state = [];
            for (var i = 0; i < 25; i++) {
              state[i] = new X64Word.init();
            }
            this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
          },
          _doProcessBlock: function(M, offset) {
            var state = this._state;
            var nBlockSizeLanes = this.blockSize / 2;
            for (var i = 0; i < nBlockSizeLanes; i++) {
              var M2i = M[offset + 2 * i];
              var M2i1 = M[offset + 2 * i + 1];
              M2i = (M2i << 8 | M2i >>> 24) & 16711935 | (M2i << 24 | M2i >>> 8) & 4278255360;
              M2i1 = (M2i1 << 8 | M2i1 >>> 24) & 16711935 | (M2i1 << 24 | M2i1 >>> 8) & 4278255360;
              var lane = state[i];
              lane.high ^= M2i1;
              lane.low ^= M2i;
            }
            for (var round = 0; round < 24; round++) {
              for (var x = 0; x < 5; x++) {
                var tMsw = 0, tLsw = 0;
                for (var y = 0; y < 5; y++) {
                  var lane = state[x + 5 * y];
                  tMsw ^= lane.high;
                  tLsw ^= lane.low;
                }
                var Tx = T[x];
                Tx.high = tMsw;
                Tx.low = tLsw;
              }
              for (var x = 0; x < 5; x++) {
                var Tx4 = T[(x + 4) % 5];
                var Tx1 = T[(x + 1) % 5];
                var Tx1Msw = Tx1.high;
                var Tx1Lsw = Tx1.low;
                var tMsw = Tx4.high ^ (Tx1Msw << 1 | Tx1Lsw >>> 31);
                var tLsw = Tx4.low ^ (Tx1Lsw << 1 | Tx1Msw >>> 31);
                for (var y = 0; y < 5; y++) {
                  var lane = state[x + 5 * y];
                  lane.high ^= tMsw;
                  lane.low ^= tLsw;
                }
              }
              for (var laneIndex = 1; laneIndex < 25; laneIndex++) {
                var tMsw;
                var tLsw;
                var lane = state[laneIndex];
                var laneMsw = lane.high;
                var laneLsw = lane.low;
                var rhoOffset = RHO_OFFSETS[laneIndex];
                if (rhoOffset < 32) {
                  tMsw = laneMsw << rhoOffset | laneLsw >>> 32 - rhoOffset;
                  tLsw = laneLsw << rhoOffset | laneMsw >>> 32 - rhoOffset;
                } else {
                  tMsw = laneLsw << rhoOffset - 32 | laneMsw >>> 64 - rhoOffset;
                  tLsw = laneMsw << rhoOffset - 32 | laneLsw >>> 64 - rhoOffset;
                }
                var TPiLane = T[PI_INDEXES[laneIndex]];
                TPiLane.high = tMsw;
                TPiLane.low = tLsw;
              }
              var T0 = T[0];
              var state0 = state[0];
              T0.high = state0.high;
              T0.low = state0.low;
              for (var x = 0; x < 5; x++) {
                for (var y = 0; y < 5; y++) {
                  var laneIndex = x + 5 * y;
                  var lane = state[laneIndex];
                  var TLane = T[laneIndex];
                  var Tx1Lane = T[(x + 1) % 5 + 5 * y];
                  var Tx2Lane = T[(x + 2) % 5 + 5 * y];
                  lane.high = TLane.high ^ ~Tx1Lane.high & Tx2Lane.high;
                  lane.low = TLane.low ^ ~Tx1Lane.low & Tx2Lane.low;
                }
              }
              var lane = state[0];
              var roundConstant = ROUND_CONSTANTS[round];
              lane.high ^= roundConstant.high;
              lane.low ^= roundConstant.low;
            }
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            var blockSizeBits = this.blockSize * 32;
            dataWords[nBitsLeft >>> 5] |= 1 << 24 - nBitsLeft % 32;
            dataWords[(Math2.ceil((nBitsLeft + 1) / blockSizeBits) * blockSizeBits >>> 5) - 1] |= 128;
            data.sigBytes = dataWords.length * 4;
            this._process();
            var state = this._state;
            var outputLengthBytes = this.cfg.outputLength / 8;
            var outputLengthLanes = outputLengthBytes / 8;
            var hashWords = [];
            for (var i = 0; i < outputLengthLanes; i++) {
              var lane = state[i];
              var laneMsw = lane.high;
              var laneLsw = lane.low;
              laneMsw = (laneMsw << 8 | laneMsw >>> 24) & 16711935 | (laneMsw << 24 | laneMsw >>> 8) & 4278255360;
              laneLsw = (laneLsw << 8 | laneLsw >>> 24) & 16711935 | (laneLsw << 24 | laneLsw >>> 8) & 4278255360;
              hashWords.push(laneLsw);
              hashWords.push(laneMsw);
            }
            return new WordArray.init(hashWords, outputLengthBytes);
          },
          clone: function() {
            var clone2 = Hasher.clone.call(this);
            var state = clone2._state = this._state.slice(0);
            for (var i = 0; i < 25; i++) {
              state[i] = state[i].clone();
            }
            return clone2;
          }
        });
        C.SHA3 = Hasher._createHelper(SHA3);
        C.HmacSHA3 = Hasher._createHmacHelper(SHA3);
      })(Math);
      return CryptoJS.SHA3;
    });
  }
});

// node_modules/crypto-js/ripemd160.js
var require_ripemd160 = __commonJS({
  "node_modules/crypto-js/ripemd160.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function(Math2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var Hasher = C_lib.Hasher;
        var C_algo = C.algo;
        var _zl = WordArray.create([
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8,
          9,
          10,
          11,
          12,
          13,
          14,
          15,
          7,
          4,
          13,
          1,
          10,
          6,
          15,
          3,
          12,
          0,
          9,
          5,
          2,
          14,
          11,
          8,
          3,
          10,
          14,
          4,
          9,
          15,
          8,
          1,
          2,
          7,
          0,
          6,
          13,
          11,
          5,
          12,
          1,
          9,
          11,
          10,
          0,
          8,
          12,
          4,
          13,
          3,
          7,
          15,
          14,
          5,
          6,
          2,
          4,
          0,
          5,
          9,
          7,
          12,
          2,
          10,
          14,
          1,
          3,
          8,
          11,
          6,
          15,
          13
        ]);
        var _zr = WordArray.create([
          5,
          14,
          7,
          0,
          9,
          2,
          11,
          4,
          13,
          6,
          15,
          8,
          1,
          10,
          3,
          12,
          6,
          11,
          3,
          7,
          0,
          13,
          5,
          10,
          14,
          15,
          8,
          12,
          4,
          9,
          1,
          2,
          15,
          5,
          1,
          3,
          7,
          14,
          6,
          9,
          11,
          8,
          12,
          2,
          10,
          0,
          4,
          13,
          8,
          6,
          4,
          1,
          3,
          11,
          15,
          0,
          5,
          12,
          2,
          13,
          9,
          7,
          10,
          14,
          12,
          15,
          10,
          4,
          1,
          5,
          8,
          7,
          6,
          2,
          13,
          14,
          0,
          3,
          9,
          11
        ]);
        var _sl = WordArray.create([
          11,
          14,
          15,
          12,
          5,
          8,
          7,
          9,
          11,
          13,
          14,
          15,
          6,
          7,
          9,
          8,
          7,
          6,
          8,
          13,
          11,
          9,
          7,
          15,
          7,
          12,
          15,
          9,
          11,
          7,
          13,
          12,
          11,
          13,
          6,
          7,
          14,
          9,
          13,
          15,
          14,
          8,
          13,
          6,
          5,
          12,
          7,
          5,
          11,
          12,
          14,
          15,
          14,
          15,
          9,
          8,
          9,
          14,
          5,
          6,
          8,
          6,
          5,
          12,
          9,
          15,
          5,
          11,
          6,
          8,
          13,
          12,
          5,
          12,
          13,
          14,
          11,
          8,
          5,
          6
        ]);
        var _sr = WordArray.create([
          8,
          9,
          9,
          11,
          13,
          15,
          15,
          5,
          7,
          7,
          8,
          11,
          14,
          14,
          12,
          6,
          9,
          13,
          15,
          7,
          12,
          8,
          9,
          11,
          7,
          7,
          12,
          7,
          6,
          15,
          13,
          11,
          9,
          7,
          15,
          11,
          8,
          6,
          6,
          14,
          12,
          13,
          5,
          14,
          13,
          13,
          7,
          5,
          15,
          5,
          8,
          11,
          14,
          14,
          6,
          14,
          6,
          9,
          12,
          9,
          12,
          5,
          15,
          8,
          8,
          5,
          12,
          9,
          12,
          5,
          14,
          6,
          8,
          13,
          6,
          5,
          15,
          13,
          11,
          11
        ]);
        var _hl = WordArray.create([0, 1518500249, 1859775393, 2400959708, 2840853838]);
        var _hr = WordArray.create([1352829926, 1548603684, 1836072691, 2053994217, 0]);
        var RIPEMD160 = C_algo.RIPEMD160 = Hasher.extend({
          _doReset: function() {
            this._hash = WordArray.create([1732584193, 4023233417, 2562383102, 271733878, 3285377520]);
          },
          _doProcessBlock: function(M, offset) {
            for (var i = 0; i < 16; i++) {
              var offset_i = offset + i;
              var M_offset_i = M[offset_i];
              M[offset_i] = (M_offset_i << 8 | M_offset_i >>> 24) & 16711935 | (M_offset_i << 24 | M_offset_i >>> 8) & 4278255360;
            }
            var H = this._hash.words;
            var hl = _hl.words;
            var hr = _hr.words;
            var zl = _zl.words;
            var zr = _zr.words;
            var sl = _sl.words;
            var sr = _sr.words;
            var al, bl, cl, dl, el;
            var ar, br, cr, dr, er;
            ar = al = H[0];
            br = bl = H[1];
            cr = cl = H[2];
            dr = dl = H[3];
            er = el = H[4];
            var t;
            for (var i = 0; i < 80; i += 1) {
              t = al + M[offset + zl[i]] | 0;
              if (i < 16) {
                t += f1(bl, cl, dl) + hl[0];
              } else if (i < 32) {
                t += f2(bl, cl, dl) + hl[1];
              } else if (i < 48) {
                t += f3(bl, cl, dl) + hl[2];
              } else if (i < 64) {
                t += f4(bl, cl, dl) + hl[3];
              } else {
                t += f5(bl, cl, dl) + hl[4];
              }
              t = t | 0;
              t = rotl(t, sl[i]);
              t = t + el | 0;
              al = el;
              el = dl;
              dl = rotl(cl, 10);
              cl = bl;
              bl = t;
              t = ar + M[offset + zr[i]] | 0;
              if (i < 16) {
                t += f5(br, cr, dr) + hr[0];
              } else if (i < 32) {
                t += f4(br, cr, dr) + hr[1];
              } else if (i < 48) {
                t += f3(br, cr, dr) + hr[2];
              } else if (i < 64) {
                t += f2(br, cr, dr) + hr[3];
              } else {
                t += f1(br, cr, dr) + hr[4];
              }
              t = t | 0;
              t = rotl(t, sr[i]);
              t = t + er | 0;
              ar = er;
              er = dr;
              dr = rotl(cr, 10);
              cr = br;
              br = t;
            }
            t = H[1] + cl + dr | 0;
            H[1] = H[2] + dl + er | 0;
            H[2] = H[3] + el + ar | 0;
            H[3] = H[4] + al + br | 0;
            H[4] = H[0] + bl + cr | 0;
            H[0] = t;
          },
          _doFinalize: function() {
            var data = this._data;
            var dataWords = data.words;
            var nBitsTotal = this._nDataBytes * 8;
            var nBitsLeft = data.sigBytes * 8;
            dataWords[nBitsLeft >>> 5] |= 128 << 24 - nBitsLeft % 32;
            dataWords[(nBitsLeft + 64 >>> 9 << 4) + 14] = (nBitsTotal << 8 | nBitsTotal >>> 24) & 16711935 | (nBitsTotal << 24 | nBitsTotal >>> 8) & 4278255360;
            data.sigBytes = (dataWords.length + 1) * 4;
            this._process();
            var hash2 = this._hash;
            var H = hash2.words;
            for (var i = 0; i < 5; i++) {
              var H_i = H[i];
              H[i] = (H_i << 8 | H_i >>> 24) & 16711935 | (H_i << 24 | H_i >>> 8) & 4278255360;
            }
            return hash2;
          },
          clone: function() {
            var clone2 = Hasher.clone.call(this);
            clone2._hash = this._hash.clone();
            return clone2;
          }
        });
        function f1(x, y, z) {
          return x ^ y ^ z;
        }
        function f2(x, y, z) {
          return x & y | ~x & z;
        }
        function f3(x, y, z) {
          return (x | ~y) ^ z;
        }
        function f4(x, y, z) {
          return x & z | y & ~z;
        }
        function f5(x, y, z) {
          return x ^ (y | ~z);
        }
        function rotl(x, n) {
          return x << n | x >>> 32 - n;
        }
        C.RIPEMD160 = Hasher._createHelper(RIPEMD160);
        C.HmacRIPEMD160 = Hasher._createHmacHelper(RIPEMD160);
      })(Math);
      return CryptoJS.RIPEMD160;
    });
  }
});

// node_modules/crypto-js/hmac.js
var require_hmac = __commonJS({
  "node_modules/crypto-js/hmac.js"(exports2, module2) {
    init_shims();
    (function(root, factory) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var C_enc = C.enc;
        var Utf8 = C_enc.Utf8;
        var C_algo = C.algo;
        var HMAC = C_algo.HMAC = Base.extend({
          init: function(hasher, key) {
            hasher = this._hasher = new hasher.init();
            if (typeof key == "string") {
              key = Utf8.parse(key);
            }
            var hasherBlockSize = hasher.blockSize;
            var hasherBlockSizeBytes = hasherBlockSize * 4;
            if (key.sigBytes > hasherBlockSizeBytes) {
              key = hasher.finalize(key);
            }
            key.clamp();
            var oKey = this._oKey = key.clone();
            var iKey = this._iKey = key.clone();
            var oKeyWords = oKey.words;
            var iKeyWords = iKey.words;
            for (var i = 0; i < hasherBlockSize; i++) {
              oKeyWords[i] ^= 1549556828;
              iKeyWords[i] ^= 909522486;
            }
            oKey.sigBytes = iKey.sigBytes = hasherBlockSizeBytes;
            this.reset();
          },
          reset: function() {
            var hasher = this._hasher;
            hasher.reset();
            hasher.update(this._iKey);
          },
          update: function(messageUpdate) {
            this._hasher.update(messageUpdate);
            return this;
          },
          finalize: function(messageUpdate) {
            var hasher = this._hasher;
            var innerHash = hasher.finalize(messageUpdate);
            hasher.reset();
            var hmac = hasher.finalize(this._oKey.clone().concat(innerHash));
            return hmac;
          }
        });
      })();
    });
  }
});

// node_modules/crypto-js/pbkdf2.js
var require_pbkdf2 = __commonJS({
  "node_modules/crypto-js/pbkdf2.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_sha1(), require_hmac());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./sha1", "./hmac"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var WordArray = C_lib.WordArray;
        var C_algo = C.algo;
        var SHA1 = C_algo.SHA1;
        var HMAC = C_algo.HMAC;
        var PBKDF2 = C_algo.PBKDF2 = Base.extend({
          cfg: Base.extend({
            keySize: 128 / 32,
            hasher: SHA1,
            iterations: 1
          }),
          init: function(cfg) {
            this.cfg = this.cfg.extend(cfg);
          },
          compute: function(password, salt) {
            var cfg = this.cfg;
            var hmac = HMAC.create(cfg.hasher, password);
            var derivedKey = WordArray.create();
            var blockIndex = WordArray.create([1]);
            var derivedKeyWords = derivedKey.words;
            var blockIndexWords = blockIndex.words;
            var keySize = cfg.keySize;
            var iterations = cfg.iterations;
            while (derivedKeyWords.length < keySize) {
              var block = hmac.update(salt).finalize(blockIndex);
              hmac.reset();
              var blockWords = block.words;
              var blockWordsLength = blockWords.length;
              var intermediate = block;
              for (var i = 1; i < iterations; i++) {
                intermediate = hmac.finalize(intermediate);
                hmac.reset();
                var intermediateWords = intermediate.words;
                for (var j = 0; j < blockWordsLength; j++) {
                  blockWords[j] ^= intermediateWords[j];
                }
              }
              derivedKey.concat(block);
              blockIndexWords[0]++;
            }
            derivedKey.sigBytes = keySize * 4;
            return derivedKey;
          }
        });
        C.PBKDF2 = function(password, salt, cfg) {
          return PBKDF2.create(cfg).compute(password, salt);
        };
      })();
      return CryptoJS.PBKDF2;
    });
  }
});

// node_modules/crypto-js/evpkdf.js
var require_evpkdf = __commonJS({
  "node_modules/crypto-js/evpkdf.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_sha1(), require_hmac());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./sha1", "./hmac"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var WordArray = C_lib.WordArray;
        var C_algo = C.algo;
        var MD5 = C_algo.MD5;
        var EvpKDF = C_algo.EvpKDF = Base.extend({
          cfg: Base.extend({
            keySize: 128 / 32,
            hasher: MD5,
            iterations: 1
          }),
          init: function(cfg) {
            this.cfg = this.cfg.extend(cfg);
          },
          compute: function(password, salt) {
            var block;
            var cfg = this.cfg;
            var hasher = cfg.hasher.create();
            var derivedKey = WordArray.create();
            var derivedKeyWords = derivedKey.words;
            var keySize = cfg.keySize;
            var iterations = cfg.iterations;
            while (derivedKeyWords.length < keySize) {
              if (block) {
                hasher.update(block);
              }
              block = hasher.update(password).finalize(salt);
              hasher.reset();
              for (var i = 1; i < iterations; i++) {
                block = hasher.finalize(block);
                hasher.reset();
              }
              derivedKey.concat(block);
            }
            derivedKey.sigBytes = keySize * 4;
            return derivedKey;
          }
        });
        C.EvpKDF = function(password, salt, cfg) {
          return EvpKDF.create(cfg).compute(password, salt);
        };
      })();
      return CryptoJS.EvpKDF;
    });
  }
});

// node_modules/crypto-js/cipher-core.js
var require_cipher_core = __commonJS({
  "node_modules/crypto-js/cipher-core.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_evpkdf());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./evpkdf"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.lib.Cipher || function(undefined2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var Base = C_lib.Base;
        var WordArray = C_lib.WordArray;
        var BufferedBlockAlgorithm = C_lib.BufferedBlockAlgorithm;
        var C_enc = C.enc;
        var Utf8 = C_enc.Utf8;
        var Base64 = C_enc.Base64;
        var C_algo = C.algo;
        var EvpKDF = C_algo.EvpKDF;
        var Cipher = C_lib.Cipher = BufferedBlockAlgorithm.extend({
          cfg: Base.extend(),
          createEncryptor: function(key, cfg) {
            return this.create(this._ENC_XFORM_MODE, key, cfg);
          },
          createDecryptor: function(key, cfg) {
            return this.create(this._DEC_XFORM_MODE, key, cfg);
          },
          init: function(xformMode, key, cfg) {
            this.cfg = this.cfg.extend(cfg);
            this._xformMode = xformMode;
            this._key = key;
            this.reset();
          },
          reset: function() {
            BufferedBlockAlgorithm.reset.call(this);
            this._doReset();
          },
          process: function(dataUpdate) {
            this._append(dataUpdate);
            return this._process();
          },
          finalize: function(dataUpdate) {
            if (dataUpdate) {
              this._append(dataUpdate);
            }
            var finalProcessedData = this._doFinalize();
            return finalProcessedData;
          },
          keySize: 128 / 32,
          ivSize: 128 / 32,
          _ENC_XFORM_MODE: 1,
          _DEC_XFORM_MODE: 2,
          _createHelper: function() {
            function selectCipherStrategy(key) {
              if (typeof key == "string") {
                return PasswordBasedCipher;
              } else {
                return SerializableCipher;
              }
            }
            return function(cipher) {
              return {
                encrypt: function(message, key, cfg) {
                  return selectCipherStrategy(key).encrypt(cipher, message, key, cfg);
                },
                decrypt: function(ciphertext, key, cfg) {
                  return selectCipherStrategy(key).decrypt(cipher, ciphertext, key, cfg);
                }
              };
            };
          }()
        });
        var StreamCipher = C_lib.StreamCipher = Cipher.extend({
          _doFinalize: function() {
            var finalProcessedBlocks = this._process(true);
            return finalProcessedBlocks;
          },
          blockSize: 1
        });
        var C_mode = C.mode = {};
        var BlockCipherMode = C_lib.BlockCipherMode = Base.extend({
          createEncryptor: function(cipher, iv) {
            return this.Encryptor.create(cipher, iv);
          },
          createDecryptor: function(cipher, iv) {
            return this.Decryptor.create(cipher, iv);
          },
          init: function(cipher, iv) {
            this._cipher = cipher;
            this._iv = iv;
          }
        });
        var CBC = C_mode.CBC = function() {
          var CBC2 = BlockCipherMode.extend();
          CBC2.Encryptor = CBC2.extend({
            processBlock: function(words, offset) {
              var cipher = this._cipher;
              var blockSize = cipher.blockSize;
              xorBlock.call(this, words, offset, blockSize);
              cipher.encryptBlock(words, offset);
              this._prevBlock = words.slice(offset, offset + blockSize);
            }
          });
          CBC2.Decryptor = CBC2.extend({
            processBlock: function(words, offset) {
              var cipher = this._cipher;
              var blockSize = cipher.blockSize;
              var thisBlock = words.slice(offset, offset + blockSize);
              cipher.decryptBlock(words, offset);
              xorBlock.call(this, words, offset, blockSize);
              this._prevBlock = thisBlock;
            }
          });
          function xorBlock(words, offset, blockSize) {
            var block;
            var iv = this._iv;
            if (iv) {
              block = iv;
              this._iv = undefined2;
            } else {
              block = this._prevBlock;
            }
            for (var i = 0; i < blockSize; i++) {
              words[offset + i] ^= block[i];
            }
          }
          return CBC2;
        }();
        var C_pad = C.pad = {};
        var Pkcs7 = C_pad.Pkcs7 = {
          pad: function(data, blockSize) {
            var blockSizeBytes = blockSize * 4;
            var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;
            var paddingWord = nPaddingBytes << 24 | nPaddingBytes << 16 | nPaddingBytes << 8 | nPaddingBytes;
            var paddingWords = [];
            for (var i = 0; i < nPaddingBytes; i += 4) {
              paddingWords.push(paddingWord);
            }
            var padding = WordArray.create(paddingWords, nPaddingBytes);
            data.concat(padding);
          },
          unpad: function(data) {
            var nPaddingBytes = data.words[data.sigBytes - 1 >>> 2] & 255;
            data.sigBytes -= nPaddingBytes;
          }
        };
        var BlockCipher = C_lib.BlockCipher = Cipher.extend({
          cfg: Cipher.cfg.extend({
            mode: CBC,
            padding: Pkcs7
          }),
          reset: function() {
            var modeCreator;
            Cipher.reset.call(this);
            var cfg = this.cfg;
            var iv = cfg.iv;
            var mode = cfg.mode;
            if (this._xformMode == this._ENC_XFORM_MODE) {
              modeCreator = mode.createEncryptor;
            } else {
              modeCreator = mode.createDecryptor;
              this._minBufferSize = 1;
            }
            if (this._mode && this._mode.__creator == modeCreator) {
              this._mode.init(this, iv && iv.words);
            } else {
              this._mode = modeCreator.call(mode, this, iv && iv.words);
              this._mode.__creator = modeCreator;
            }
          },
          _doProcessBlock: function(words, offset) {
            this._mode.processBlock(words, offset);
          },
          _doFinalize: function() {
            var finalProcessedBlocks;
            var padding = this.cfg.padding;
            if (this._xformMode == this._ENC_XFORM_MODE) {
              padding.pad(this._data, this.blockSize);
              finalProcessedBlocks = this._process(true);
            } else {
              finalProcessedBlocks = this._process(true);
              padding.unpad(finalProcessedBlocks);
            }
            return finalProcessedBlocks;
          },
          blockSize: 128 / 32
        });
        var CipherParams = C_lib.CipherParams = Base.extend({
          init: function(cipherParams) {
            this.mixIn(cipherParams);
          },
          toString: function(formatter) {
            return (formatter || this.formatter).stringify(this);
          }
        });
        var C_format = C.format = {};
        var OpenSSLFormatter = C_format.OpenSSL = {
          stringify: function(cipherParams) {
            var wordArray;
            var ciphertext = cipherParams.ciphertext;
            var salt = cipherParams.salt;
            if (salt) {
              wordArray = WordArray.create([1398893684, 1701076831]).concat(salt).concat(ciphertext);
            } else {
              wordArray = ciphertext;
            }
            return wordArray.toString(Base64);
          },
          parse: function(openSSLStr) {
            var salt;
            var ciphertext = Base64.parse(openSSLStr);
            var ciphertextWords = ciphertext.words;
            if (ciphertextWords[0] == 1398893684 && ciphertextWords[1] == 1701076831) {
              salt = WordArray.create(ciphertextWords.slice(2, 4));
              ciphertextWords.splice(0, 4);
              ciphertext.sigBytes -= 16;
            }
            return CipherParams.create({ ciphertext, salt });
          }
        };
        var SerializableCipher = C_lib.SerializableCipher = Base.extend({
          cfg: Base.extend({
            format: OpenSSLFormatter
          }),
          encrypt: function(cipher, message, key, cfg) {
            cfg = this.cfg.extend(cfg);
            var encryptor = cipher.createEncryptor(key, cfg);
            var ciphertext = encryptor.finalize(message);
            var cipherCfg = encryptor.cfg;
            return CipherParams.create({
              ciphertext,
              key,
              iv: cipherCfg.iv,
              algorithm: cipher,
              mode: cipherCfg.mode,
              padding: cipherCfg.padding,
              blockSize: cipher.blockSize,
              formatter: cfg.format
            });
          },
          decrypt: function(cipher, ciphertext, key, cfg) {
            cfg = this.cfg.extend(cfg);
            ciphertext = this._parse(ciphertext, cfg.format);
            var plaintext = cipher.createDecryptor(key, cfg).finalize(ciphertext.ciphertext);
            return plaintext;
          },
          _parse: function(ciphertext, format3) {
            if (typeof ciphertext == "string") {
              return format3.parse(ciphertext, this);
            } else {
              return ciphertext;
            }
          }
        });
        var C_kdf = C.kdf = {};
        var OpenSSLKdf = C_kdf.OpenSSL = {
          execute: function(password, keySize, ivSize, salt) {
            if (!salt) {
              salt = WordArray.random(64 / 8);
            }
            var key = EvpKDF.create({ keySize: keySize + ivSize }).compute(password, salt);
            var iv = WordArray.create(key.words.slice(keySize), ivSize * 4);
            key.sigBytes = keySize * 4;
            return CipherParams.create({ key, iv, salt });
          }
        };
        var PasswordBasedCipher = C_lib.PasswordBasedCipher = SerializableCipher.extend({
          cfg: SerializableCipher.cfg.extend({
            kdf: OpenSSLKdf
          }),
          encrypt: function(cipher, message, password, cfg) {
            cfg = this.cfg.extend(cfg);
            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize);
            cfg.iv = derivedParams.iv;
            var ciphertext = SerializableCipher.encrypt.call(this, cipher, message, derivedParams.key, cfg);
            ciphertext.mixIn(derivedParams);
            return ciphertext;
          },
          decrypt: function(cipher, ciphertext, password, cfg) {
            cfg = this.cfg.extend(cfg);
            ciphertext = this._parse(ciphertext, cfg.format);
            var derivedParams = cfg.kdf.execute(password, cipher.keySize, cipher.ivSize, ciphertext.salt);
            cfg.iv = derivedParams.iv;
            var plaintext = SerializableCipher.decrypt.call(this, cipher, ciphertext, derivedParams.key, cfg);
            return plaintext;
          }
        });
      }();
    });
  }
});

// node_modules/crypto-js/mode-cfb.js
var require_mode_cfb = __commonJS({
  "node_modules/crypto-js/mode-cfb.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.mode.CFB = function() {
        var CFB = CryptoJS.lib.BlockCipherMode.extend();
        CFB.Encryptor = CFB.extend({
          processBlock: function(words, offset) {
            var cipher = this._cipher;
            var blockSize = cipher.blockSize;
            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);
            this._prevBlock = words.slice(offset, offset + blockSize);
          }
        });
        CFB.Decryptor = CFB.extend({
          processBlock: function(words, offset) {
            var cipher = this._cipher;
            var blockSize = cipher.blockSize;
            var thisBlock = words.slice(offset, offset + blockSize);
            generateKeystreamAndEncrypt.call(this, words, offset, blockSize, cipher);
            this._prevBlock = thisBlock;
          }
        });
        function generateKeystreamAndEncrypt(words, offset, blockSize, cipher) {
          var keystream;
          var iv = this._iv;
          if (iv) {
            keystream = iv.slice(0);
            this._iv = void 0;
          } else {
            keystream = this._prevBlock;
          }
          cipher.encryptBlock(keystream, 0);
          for (var i = 0; i < blockSize; i++) {
            words[offset + i] ^= keystream[i];
          }
        }
        return CFB;
      }();
      return CryptoJS.mode.CFB;
    });
  }
});

// node_modules/crypto-js/mode-ctr.js
var require_mode_ctr = __commonJS({
  "node_modules/crypto-js/mode-ctr.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.mode.CTR = function() {
        var CTR = CryptoJS.lib.BlockCipherMode.extend();
        var Encryptor = CTR.Encryptor = CTR.extend({
          processBlock: function(words, offset) {
            var cipher = this._cipher;
            var blockSize = cipher.blockSize;
            var iv = this._iv;
            var counter = this._counter;
            if (iv) {
              counter = this._counter = iv.slice(0);
              this._iv = void 0;
            }
            var keystream = counter.slice(0);
            cipher.encryptBlock(keystream, 0);
            counter[blockSize - 1] = counter[blockSize - 1] + 1 | 0;
            for (var i = 0; i < blockSize; i++) {
              words[offset + i] ^= keystream[i];
            }
          }
        });
        CTR.Decryptor = Encryptor;
        return CTR;
      }();
      return CryptoJS.mode.CTR;
    });
  }
});

// node_modules/crypto-js/mode-ctr-gladman.js
var require_mode_ctr_gladman = __commonJS({
  "node_modules/crypto-js/mode-ctr-gladman.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.mode.CTRGladman = function() {
        var CTRGladman = CryptoJS.lib.BlockCipherMode.extend();
        function incWord(word) {
          if ((word >> 24 & 255) === 255) {
            var b1 = word >> 16 & 255;
            var b2 = word >> 8 & 255;
            var b3 = word & 255;
            if (b1 === 255) {
              b1 = 0;
              if (b2 === 255) {
                b2 = 0;
                if (b3 === 255) {
                  b3 = 0;
                } else {
                  ++b3;
                }
              } else {
                ++b2;
              }
            } else {
              ++b1;
            }
            word = 0;
            word += b1 << 16;
            word += b2 << 8;
            word += b3;
          } else {
            word += 1 << 24;
          }
          return word;
        }
        function incCounter(counter) {
          if ((counter[0] = incWord(counter[0])) === 0) {
            counter[1] = incWord(counter[1]);
          }
          return counter;
        }
        var Encryptor = CTRGladman.Encryptor = CTRGladman.extend({
          processBlock: function(words, offset) {
            var cipher = this._cipher;
            var blockSize = cipher.blockSize;
            var iv = this._iv;
            var counter = this._counter;
            if (iv) {
              counter = this._counter = iv.slice(0);
              this._iv = void 0;
            }
            incCounter(counter);
            var keystream = counter.slice(0);
            cipher.encryptBlock(keystream, 0);
            for (var i = 0; i < blockSize; i++) {
              words[offset + i] ^= keystream[i];
            }
          }
        });
        CTRGladman.Decryptor = Encryptor;
        return CTRGladman;
      }();
      return CryptoJS.mode.CTRGladman;
    });
  }
});

// node_modules/crypto-js/mode-ofb.js
var require_mode_ofb = __commonJS({
  "node_modules/crypto-js/mode-ofb.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.mode.OFB = function() {
        var OFB = CryptoJS.lib.BlockCipherMode.extend();
        var Encryptor = OFB.Encryptor = OFB.extend({
          processBlock: function(words, offset) {
            var cipher = this._cipher;
            var blockSize = cipher.blockSize;
            var iv = this._iv;
            var keystream = this._keystream;
            if (iv) {
              keystream = this._keystream = iv.slice(0);
              this._iv = void 0;
            }
            cipher.encryptBlock(keystream, 0);
            for (var i = 0; i < blockSize; i++) {
              words[offset + i] ^= keystream[i];
            }
          }
        });
        OFB.Decryptor = Encryptor;
        return OFB;
      }();
      return CryptoJS.mode.OFB;
    });
  }
});

// node_modules/crypto-js/mode-ecb.js
var require_mode_ecb = __commonJS({
  "node_modules/crypto-js/mode-ecb.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.mode.ECB = function() {
        var ECB = CryptoJS.lib.BlockCipherMode.extend();
        ECB.Encryptor = ECB.extend({
          processBlock: function(words, offset) {
            this._cipher.encryptBlock(words, offset);
          }
        });
        ECB.Decryptor = ECB.extend({
          processBlock: function(words, offset) {
            this._cipher.decryptBlock(words, offset);
          }
        });
        return ECB;
      }();
      return CryptoJS.mode.ECB;
    });
  }
});

// node_modules/crypto-js/pad-ansix923.js
var require_pad_ansix923 = __commonJS({
  "node_modules/crypto-js/pad-ansix923.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.pad.AnsiX923 = {
        pad: function(data, blockSize) {
          var dataSigBytes = data.sigBytes;
          var blockSizeBytes = blockSize * 4;
          var nPaddingBytes = blockSizeBytes - dataSigBytes % blockSizeBytes;
          var lastBytePos = dataSigBytes + nPaddingBytes - 1;
          data.clamp();
          data.words[lastBytePos >>> 2] |= nPaddingBytes << 24 - lastBytePos % 4 * 8;
          data.sigBytes += nPaddingBytes;
        },
        unpad: function(data) {
          var nPaddingBytes = data.words[data.sigBytes - 1 >>> 2] & 255;
          data.sigBytes -= nPaddingBytes;
        }
      };
      return CryptoJS.pad.Ansix923;
    });
  }
});

// node_modules/crypto-js/pad-iso10126.js
var require_pad_iso10126 = __commonJS({
  "node_modules/crypto-js/pad-iso10126.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.pad.Iso10126 = {
        pad: function(data, blockSize) {
          var blockSizeBytes = blockSize * 4;
          var nPaddingBytes = blockSizeBytes - data.sigBytes % blockSizeBytes;
          data.concat(CryptoJS.lib.WordArray.random(nPaddingBytes - 1)).concat(CryptoJS.lib.WordArray.create([nPaddingBytes << 24], 1));
        },
        unpad: function(data) {
          var nPaddingBytes = data.words[data.sigBytes - 1 >>> 2] & 255;
          data.sigBytes -= nPaddingBytes;
        }
      };
      return CryptoJS.pad.Iso10126;
    });
  }
});

// node_modules/crypto-js/pad-iso97971.js
var require_pad_iso97971 = __commonJS({
  "node_modules/crypto-js/pad-iso97971.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.pad.Iso97971 = {
        pad: function(data, blockSize) {
          data.concat(CryptoJS.lib.WordArray.create([2147483648], 1));
          CryptoJS.pad.ZeroPadding.pad(data, blockSize);
        },
        unpad: function(data) {
          CryptoJS.pad.ZeroPadding.unpad(data);
          data.sigBytes--;
        }
      };
      return CryptoJS.pad.Iso97971;
    });
  }
});

// node_modules/crypto-js/pad-zeropadding.js
var require_pad_zeropadding = __commonJS({
  "node_modules/crypto-js/pad-zeropadding.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.pad.ZeroPadding = {
        pad: function(data, blockSize) {
          var blockSizeBytes = blockSize * 4;
          data.clamp();
          data.sigBytes += blockSizeBytes - (data.sigBytes % blockSizeBytes || blockSizeBytes);
        },
        unpad: function(data) {
          var dataWords = data.words;
          var i = data.sigBytes - 1;
          for (var i = data.sigBytes - 1; i >= 0; i--) {
            if (dataWords[i >>> 2] >>> 24 - i % 4 * 8 & 255) {
              data.sigBytes = i + 1;
              break;
            }
          }
        }
      };
      return CryptoJS.pad.ZeroPadding;
    });
  }
});

// node_modules/crypto-js/pad-nopadding.js
var require_pad_nopadding = __commonJS({
  "node_modules/crypto-js/pad-nopadding.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      CryptoJS.pad.NoPadding = {
        pad: function() {
        },
        unpad: function() {
        }
      };
      return CryptoJS.pad.NoPadding;
    });
  }
});

// node_modules/crypto-js/format-hex.js
var require_format_hex = __commonJS({
  "node_modules/crypto-js/format-hex.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function(undefined2) {
        var C = CryptoJS;
        var C_lib = C.lib;
        var CipherParams = C_lib.CipherParams;
        var C_enc = C.enc;
        var Hex = C_enc.Hex;
        var C_format = C.format;
        var HexFormatter = C_format.Hex = {
          stringify: function(cipherParams) {
            return cipherParams.ciphertext.toString(Hex);
          },
          parse: function(input) {
            var ciphertext = Hex.parse(input);
            return CipherParams.create({ ciphertext });
          }
        };
      })();
      return CryptoJS.format.Hex;
    });
  }
});

// node_modules/crypto-js/aes.js
var require_aes = __commonJS({
  "node_modules/crypto-js/aes.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_enc_base64(), require_md5(), require_evpkdf(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var BlockCipher = C_lib.BlockCipher;
        var C_algo = C.algo;
        var SBOX = [];
        var INV_SBOX = [];
        var SUB_MIX_0 = [];
        var SUB_MIX_1 = [];
        var SUB_MIX_2 = [];
        var SUB_MIX_3 = [];
        var INV_SUB_MIX_0 = [];
        var INV_SUB_MIX_1 = [];
        var INV_SUB_MIX_2 = [];
        var INV_SUB_MIX_3 = [];
        (function() {
          var d2 = [];
          for (var i = 0; i < 256; i++) {
            if (i < 128) {
              d2[i] = i << 1;
            } else {
              d2[i] = i << 1 ^ 283;
            }
          }
          var x = 0;
          var xi = 0;
          for (var i = 0; i < 256; i++) {
            var sx = xi ^ xi << 1 ^ xi << 2 ^ xi << 3 ^ xi << 4;
            sx = sx >>> 8 ^ sx & 255 ^ 99;
            SBOX[x] = sx;
            INV_SBOX[sx] = x;
            var x2 = d2[x];
            var x4 = d2[x2];
            var x8 = d2[x4];
            var t = d2[sx] * 257 ^ sx * 16843008;
            SUB_MIX_0[x] = t << 24 | t >>> 8;
            SUB_MIX_1[x] = t << 16 | t >>> 16;
            SUB_MIX_2[x] = t << 8 | t >>> 24;
            SUB_MIX_3[x] = t;
            var t = x8 * 16843009 ^ x4 * 65537 ^ x2 * 257 ^ x * 16843008;
            INV_SUB_MIX_0[sx] = t << 24 | t >>> 8;
            INV_SUB_MIX_1[sx] = t << 16 | t >>> 16;
            INV_SUB_MIX_2[sx] = t << 8 | t >>> 24;
            INV_SUB_MIX_3[sx] = t;
            if (!x) {
              x = xi = 1;
            } else {
              x = x2 ^ d2[d2[d2[x8 ^ x2]]];
              xi ^= d2[d2[xi]];
            }
          }
        })();
        var RCON = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54];
        var AES = C_algo.AES = BlockCipher.extend({
          _doReset: function() {
            var t;
            if (this._nRounds && this._keyPriorReset === this._key) {
              return;
            }
            var key = this._keyPriorReset = this._key;
            var keyWords = key.words;
            var keySize = key.sigBytes / 4;
            var nRounds = this._nRounds = keySize + 6;
            var ksRows = (nRounds + 1) * 4;
            var keySchedule = this._keySchedule = [];
            for (var ksRow = 0; ksRow < ksRows; ksRow++) {
              if (ksRow < keySize) {
                keySchedule[ksRow] = keyWords[ksRow];
              } else {
                t = keySchedule[ksRow - 1];
                if (!(ksRow % keySize)) {
                  t = t << 8 | t >>> 24;
                  t = SBOX[t >>> 24] << 24 | SBOX[t >>> 16 & 255] << 16 | SBOX[t >>> 8 & 255] << 8 | SBOX[t & 255];
                  t ^= RCON[ksRow / keySize | 0] << 24;
                } else if (keySize > 6 && ksRow % keySize == 4) {
                  t = SBOX[t >>> 24] << 24 | SBOX[t >>> 16 & 255] << 16 | SBOX[t >>> 8 & 255] << 8 | SBOX[t & 255];
                }
                keySchedule[ksRow] = keySchedule[ksRow - keySize] ^ t;
              }
            }
            var invKeySchedule = this._invKeySchedule = [];
            for (var invKsRow = 0; invKsRow < ksRows; invKsRow++) {
              var ksRow = ksRows - invKsRow;
              if (invKsRow % 4) {
                var t = keySchedule[ksRow];
              } else {
                var t = keySchedule[ksRow - 4];
              }
              if (invKsRow < 4 || ksRow <= 4) {
                invKeySchedule[invKsRow] = t;
              } else {
                invKeySchedule[invKsRow] = INV_SUB_MIX_0[SBOX[t >>> 24]] ^ INV_SUB_MIX_1[SBOX[t >>> 16 & 255]] ^ INV_SUB_MIX_2[SBOX[t >>> 8 & 255]] ^ INV_SUB_MIX_3[SBOX[t & 255]];
              }
            }
          },
          encryptBlock: function(M, offset) {
            this._doCryptBlock(M, offset, this._keySchedule, SUB_MIX_0, SUB_MIX_1, SUB_MIX_2, SUB_MIX_3, SBOX);
          },
          decryptBlock: function(M, offset) {
            var t = M[offset + 1];
            M[offset + 1] = M[offset + 3];
            M[offset + 3] = t;
            this._doCryptBlock(M, offset, this._invKeySchedule, INV_SUB_MIX_0, INV_SUB_MIX_1, INV_SUB_MIX_2, INV_SUB_MIX_3, INV_SBOX);
            var t = M[offset + 1];
            M[offset + 1] = M[offset + 3];
            M[offset + 3] = t;
          },
          _doCryptBlock: function(M, offset, keySchedule, SUB_MIX_02, SUB_MIX_12, SUB_MIX_22, SUB_MIX_32, SBOX2) {
            var nRounds = this._nRounds;
            var s0 = M[offset] ^ keySchedule[0];
            var s1 = M[offset + 1] ^ keySchedule[1];
            var s2 = M[offset + 2] ^ keySchedule[2];
            var s3 = M[offset + 3] ^ keySchedule[3];
            var ksRow = 4;
            for (var round = 1; round < nRounds; round++) {
              var t0 = SUB_MIX_02[s0 >>> 24] ^ SUB_MIX_12[s1 >>> 16 & 255] ^ SUB_MIX_22[s2 >>> 8 & 255] ^ SUB_MIX_32[s3 & 255] ^ keySchedule[ksRow++];
              var t1 = SUB_MIX_02[s1 >>> 24] ^ SUB_MIX_12[s2 >>> 16 & 255] ^ SUB_MIX_22[s3 >>> 8 & 255] ^ SUB_MIX_32[s0 & 255] ^ keySchedule[ksRow++];
              var t2 = SUB_MIX_02[s2 >>> 24] ^ SUB_MIX_12[s3 >>> 16 & 255] ^ SUB_MIX_22[s0 >>> 8 & 255] ^ SUB_MIX_32[s1 & 255] ^ keySchedule[ksRow++];
              var t3 = SUB_MIX_02[s3 >>> 24] ^ SUB_MIX_12[s0 >>> 16 & 255] ^ SUB_MIX_22[s1 >>> 8 & 255] ^ SUB_MIX_32[s2 & 255] ^ keySchedule[ksRow++];
              s0 = t0;
              s1 = t1;
              s2 = t2;
              s3 = t3;
            }
            var t0 = (SBOX2[s0 >>> 24] << 24 | SBOX2[s1 >>> 16 & 255] << 16 | SBOX2[s2 >>> 8 & 255] << 8 | SBOX2[s3 & 255]) ^ keySchedule[ksRow++];
            var t1 = (SBOX2[s1 >>> 24] << 24 | SBOX2[s2 >>> 16 & 255] << 16 | SBOX2[s3 >>> 8 & 255] << 8 | SBOX2[s0 & 255]) ^ keySchedule[ksRow++];
            var t2 = (SBOX2[s2 >>> 24] << 24 | SBOX2[s3 >>> 16 & 255] << 16 | SBOX2[s0 >>> 8 & 255] << 8 | SBOX2[s1 & 255]) ^ keySchedule[ksRow++];
            var t3 = (SBOX2[s3 >>> 24] << 24 | SBOX2[s0 >>> 16 & 255] << 16 | SBOX2[s1 >>> 8 & 255] << 8 | SBOX2[s2 & 255]) ^ keySchedule[ksRow++];
            M[offset] = t0;
            M[offset + 1] = t1;
            M[offset + 2] = t2;
            M[offset + 3] = t3;
          },
          keySize: 256 / 32
        });
        C.AES = BlockCipher._createHelper(AES);
      })();
      return CryptoJS.AES;
    });
  }
});

// node_modules/crypto-js/tripledes.js
var require_tripledes = __commonJS({
  "node_modules/crypto-js/tripledes.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_enc_base64(), require_md5(), require_evpkdf(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var WordArray = C_lib.WordArray;
        var BlockCipher = C_lib.BlockCipher;
        var C_algo = C.algo;
        var PC1 = [
          57,
          49,
          41,
          33,
          25,
          17,
          9,
          1,
          58,
          50,
          42,
          34,
          26,
          18,
          10,
          2,
          59,
          51,
          43,
          35,
          27,
          19,
          11,
          3,
          60,
          52,
          44,
          36,
          63,
          55,
          47,
          39,
          31,
          23,
          15,
          7,
          62,
          54,
          46,
          38,
          30,
          22,
          14,
          6,
          61,
          53,
          45,
          37,
          29,
          21,
          13,
          5,
          28,
          20,
          12,
          4
        ];
        var PC2 = [
          14,
          17,
          11,
          24,
          1,
          5,
          3,
          28,
          15,
          6,
          21,
          10,
          23,
          19,
          12,
          4,
          26,
          8,
          16,
          7,
          27,
          20,
          13,
          2,
          41,
          52,
          31,
          37,
          47,
          55,
          30,
          40,
          51,
          45,
          33,
          48,
          44,
          49,
          39,
          56,
          34,
          53,
          46,
          42,
          50,
          36,
          29,
          32
        ];
        var BIT_SHIFTS = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28];
        var SBOX_P = [
          {
            0: 8421888,
            268435456: 32768,
            536870912: 8421378,
            805306368: 2,
            1073741824: 512,
            1342177280: 8421890,
            1610612736: 8389122,
            1879048192: 8388608,
            2147483648: 514,
            2415919104: 8389120,
            2684354560: 33280,
            2952790016: 8421376,
            3221225472: 32770,
            3489660928: 8388610,
            3758096384: 0,
            4026531840: 33282,
            134217728: 0,
            402653184: 8421890,
            671088640: 33282,
            939524096: 32768,
            1207959552: 8421888,
            1476395008: 512,
            1744830464: 8421378,
            2013265920: 2,
            2281701376: 8389120,
            2550136832: 33280,
            2818572288: 8421376,
            3087007744: 8389122,
            3355443200: 8388610,
            3623878656: 32770,
            3892314112: 514,
            4160749568: 8388608,
            1: 32768,
            268435457: 2,
            536870913: 8421888,
            805306369: 8388608,
            1073741825: 8421378,
            1342177281: 33280,
            1610612737: 512,
            1879048193: 8389122,
            2147483649: 8421890,
            2415919105: 8421376,
            2684354561: 8388610,
            2952790017: 33282,
            3221225473: 514,
            3489660929: 8389120,
            3758096385: 32770,
            4026531841: 0,
            134217729: 8421890,
            402653185: 8421376,
            671088641: 8388608,
            939524097: 512,
            1207959553: 32768,
            1476395009: 8388610,
            1744830465: 2,
            2013265921: 33282,
            2281701377: 32770,
            2550136833: 8389122,
            2818572289: 514,
            3087007745: 8421888,
            3355443201: 8389120,
            3623878657: 0,
            3892314113: 33280,
            4160749569: 8421378
          },
          {
            0: 1074282512,
            16777216: 16384,
            33554432: 524288,
            50331648: 1074266128,
            67108864: 1073741840,
            83886080: 1074282496,
            100663296: 1073758208,
            117440512: 16,
            134217728: 540672,
            150994944: 1073758224,
            167772160: 1073741824,
            184549376: 540688,
            201326592: 524304,
            218103808: 0,
            234881024: 16400,
            251658240: 1074266112,
            8388608: 1073758208,
            25165824: 540688,
            41943040: 16,
            58720256: 1073758224,
            75497472: 1074282512,
            92274688: 1073741824,
            109051904: 524288,
            125829120: 1074266128,
            142606336: 524304,
            159383552: 0,
            176160768: 16384,
            192937984: 1074266112,
            209715200: 1073741840,
            226492416: 540672,
            243269632: 1074282496,
            260046848: 16400,
            268435456: 0,
            285212672: 1074266128,
            301989888: 1073758224,
            318767104: 1074282496,
            335544320: 1074266112,
            352321536: 16,
            369098752: 540688,
            385875968: 16384,
            402653184: 16400,
            419430400: 524288,
            436207616: 524304,
            452984832: 1073741840,
            469762048: 540672,
            486539264: 1073758208,
            503316480: 1073741824,
            520093696: 1074282512,
            276824064: 540688,
            293601280: 524288,
            310378496: 1074266112,
            327155712: 16384,
            343932928: 1073758208,
            360710144: 1074282512,
            377487360: 16,
            394264576: 1073741824,
            411041792: 1074282496,
            427819008: 1073741840,
            444596224: 1073758224,
            461373440: 524304,
            478150656: 0,
            494927872: 16400,
            511705088: 1074266128,
            528482304: 540672
          },
          {
            0: 260,
            1048576: 0,
            2097152: 67109120,
            3145728: 65796,
            4194304: 65540,
            5242880: 67108868,
            6291456: 67174660,
            7340032: 67174400,
            8388608: 67108864,
            9437184: 67174656,
            10485760: 65792,
            11534336: 67174404,
            12582912: 67109124,
            13631488: 65536,
            14680064: 4,
            15728640: 256,
            524288: 67174656,
            1572864: 67174404,
            2621440: 0,
            3670016: 67109120,
            4718592: 67108868,
            5767168: 65536,
            6815744: 65540,
            7864320: 260,
            8912896: 4,
            9961472: 256,
            11010048: 67174400,
            12058624: 65796,
            13107200: 65792,
            14155776: 67109124,
            15204352: 67174660,
            16252928: 67108864,
            16777216: 67174656,
            17825792: 65540,
            18874368: 65536,
            19922944: 67109120,
            20971520: 256,
            22020096: 67174660,
            23068672: 67108868,
            24117248: 0,
            25165824: 67109124,
            26214400: 67108864,
            27262976: 4,
            28311552: 65792,
            29360128: 67174400,
            30408704: 260,
            31457280: 65796,
            32505856: 67174404,
            17301504: 67108864,
            18350080: 260,
            19398656: 67174656,
            20447232: 0,
            21495808: 65540,
            22544384: 67109120,
            23592960: 256,
            24641536: 67174404,
            25690112: 65536,
            26738688: 67174660,
            27787264: 65796,
            28835840: 67108868,
            29884416: 67109124,
            30932992: 67174400,
            31981568: 4,
            33030144: 65792
          },
          {
            0: 2151682048,
            65536: 2147487808,
            131072: 4198464,
            196608: 2151677952,
            262144: 0,
            327680: 4198400,
            393216: 2147483712,
            458752: 4194368,
            524288: 2147483648,
            589824: 4194304,
            655360: 64,
            720896: 2147487744,
            786432: 2151678016,
            851968: 4160,
            917504: 4096,
            983040: 2151682112,
            32768: 2147487808,
            98304: 64,
            163840: 2151678016,
            229376: 2147487744,
            294912: 4198400,
            360448: 2151682112,
            425984: 0,
            491520: 2151677952,
            557056: 4096,
            622592: 2151682048,
            688128: 4194304,
            753664: 4160,
            819200: 2147483648,
            884736: 4194368,
            950272: 4198464,
            1015808: 2147483712,
            1048576: 4194368,
            1114112: 4198400,
            1179648: 2147483712,
            1245184: 0,
            1310720: 4160,
            1376256: 2151678016,
            1441792: 2151682048,
            1507328: 2147487808,
            1572864: 2151682112,
            1638400: 2147483648,
            1703936: 2151677952,
            1769472: 4198464,
            1835008: 2147487744,
            1900544: 4194304,
            1966080: 64,
            2031616: 4096,
            1081344: 2151677952,
            1146880: 2151682112,
            1212416: 0,
            1277952: 4198400,
            1343488: 4194368,
            1409024: 2147483648,
            1474560: 2147487808,
            1540096: 64,
            1605632: 2147483712,
            1671168: 4096,
            1736704: 2147487744,
            1802240: 2151678016,
            1867776: 4160,
            1933312: 2151682048,
            1998848: 4194304,
            2064384: 4198464
          },
          {
            0: 128,
            4096: 17039360,
            8192: 262144,
            12288: 536870912,
            16384: 537133184,
            20480: 16777344,
            24576: 553648256,
            28672: 262272,
            32768: 16777216,
            36864: 537133056,
            40960: 536871040,
            45056: 553910400,
            49152: 553910272,
            53248: 0,
            57344: 17039488,
            61440: 553648128,
            2048: 17039488,
            6144: 553648256,
            10240: 128,
            14336: 17039360,
            18432: 262144,
            22528: 537133184,
            26624: 553910272,
            30720: 536870912,
            34816: 537133056,
            38912: 0,
            43008: 553910400,
            47104: 16777344,
            51200: 536871040,
            55296: 553648128,
            59392: 16777216,
            63488: 262272,
            65536: 262144,
            69632: 128,
            73728: 536870912,
            77824: 553648256,
            81920: 16777344,
            86016: 553910272,
            90112: 537133184,
            94208: 16777216,
            98304: 553910400,
            102400: 553648128,
            106496: 17039360,
            110592: 537133056,
            114688: 262272,
            118784: 536871040,
            122880: 0,
            126976: 17039488,
            67584: 553648256,
            71680: 16777216,
            75776: 17039360,
            79872: 537133184,
            83968: 536870912,
            88064: 17039488,
            92160: 128,
            96256: 553910272,
            100352: 262272,
            104448: 553910400,
            108544: 0,
            112640: 553648128,
            116736: 16777344,
            120832: 262144,
            124928: 537133056,
            129024: 536871040
          },
          {
            0: 268435464,
            256: 8192,
            512: 270532608,
            768: 270540808,
            1024: 268443648,
            1280: 2097152,
            1536: 2097160,
            1792: 268435456,
            2048: 0,
            2304: 268443656,
            2560: 2105344,
            2816: 8,
            3072: 270532616,
            3328: 2105352,
            3584: 8200,
            3840: 270540800,
            128: 270532608,
            384: 270540808,
            640: 8,
            896: 2097152,
            1152: 2105352,
            1408: 268435464,
            1664: 268443648,
            1920: 8200,
            2176: 2097160,
            2432: 8192,
            2688: 268443656,
            2944: 270532616,
            3200: 0,
            3456: 270540800,
            3712: 2105344,
            3968: 268435456,
            4096: 268443648,
            4352: 270532616,
            4608: 270540808,
            4864: 8200,
            5120: 2097152,
            5376: 268435456,
            5632: 268435464,
            5888: 2105344,
            6144: 2105352,
            6400: 0,
            6656: 8,
            6912: 270532608,
            7168: 8192,
            7424: 268443656,
            7680: 270540800,
            7936: 2097160,
            4224: 8,
            4480: 2105344,
            4736: 2097152,
            4992: 268435464,
            5248: 268443648,
            5504: 8200,
            5760: 270540808,
            6016: 270532608,
            6272: 270540800,
            6528: 270532616,
            6784: 8192,
            7040: 2105352,
            7296: 2097160,
            7552: 0,
            7808: 268435456,
            8064: 268443656
          },
          {
            0: 1048576,
            16: 33555457,
            32: 1024,
            48: 1049601,
            64: 34604033,
            80: 0,
            96: 1,
            112: 34603009,
            128: 33555456,
            144: 1048577,
            160: 33554433,
            176: 34604032,
            192: 34603008,
            208: 1025,
            224: 1049600,
            240: 33554432,
            8: 34603009,
            24: 0,
            40: 33555457,
            56: 34604032,
            72: 1048576,
            88: 33554433,
            104: 33554432,
            120: 1025,
            136: 1049601,
            152: 33555456,
            168: 34603008,
            184: 1048577,
            200: 1024,
            216: 34604033,
            232: 1,
            248: 1049600,
            256: 33554432,
            272: 1048576,
            288: 33555457,
            304: 34603009,
            320: 1048577,
            336: 33555456,
            352: 34604032,
            368: 1049601,
            384: 1025,
            400: 34604033,
            416: 1049600,
            432: 1,
            448: 0,
            464: 34603008,
            480: 33554433,
            496: 1024,
            264: 1049600,
            280: 33555457,
            296: 34603009,
            312: 1,
            328: 33554432,
            344: 1048576,
            360: 1025,
            376: 34604032,
            392: 33554433,
            408: 34603008,
            424: 0,
            440: 34604033,
            456: 1049601,
            472: 1024,
            488: 33555456,
            504: 1048577
          },
          {
            0: 134219808,
            1: 131072,
            2: 134217728,
            3: 32,
            4: 131104,
            5: 134350880,
            6: 134350848,
            7: 2048,
            8: 134348800,
            9: 134219776,
            10: 133120,
            11: 134348832,
            12: 2080,
            13: 0,
            14: 134217760,
            15: 133152,
            2147483648: 2048,
            2147483649: 134350880,
            2147483650: 134219808,
            2147483651: 134217728,
            2147483652: 134348800,
            2147483653: 133120,
            2147483654: 133152,
            2147483655: 32,
            2147483656: 134217760,
            2147483657: 2080,
            2147483658: 131104,
            2147483659: 134350848,
            2147483660: 0,
            2147483661: 134348832,
            2147483662: 134219776,
            2147483663: 131072,
            16: 133152,
            17: 134350848,
            18: 32,
            19: 2048,
            20: 134219776,
            21: 134217760,
            22: 134348832,
            23: 131072,
            24: 0,
            25: 131104,
            26: 134348800,
            27: 134219808,
            28: 134350880,
            29: 133120,
            30: 2080,
            31: 134217728,
            2147483664: 131072,
            2147483665: 2048,
            2147483666: 134348832,
            2147483667: 133152,
            2147483668: 32,
            2147483669: 134348800,
            2147483670: 134217728,
            2147483671: 134219808,
            2147483672: 134350880,
            2147483673: 134217760,
            2147483674: 134219776,
            2147483675: 0,
            2147483676: 133120,
            2147483677: 2080,
            2147483678: 131104,
            2147483679: 134350848
          }
        ];
        var SBOX_MASK = [
          4160749569,
          528482304,
          33030144,
          2064384,
          129024,
          8064,
          504,
          2147483679
        ];
        var DES = C_algo.DES = BlockCipher.extend({
          _doReset: function() {
            var key = this._key;
            var keyWords = key.words;
            var keyBits = [];
            for (var i = 0; i < 56; i++) {
              var keyBitPos = PC1[i] - 1;
              keyBits[i] = keyWords[keyBitPos >>> 5] >>> 31 - keyBitPos % 32 & 1;
            }
            var subKeys = this._subKeys = [];
            for (var nSubKey = 0; nSubKey < 16; nSubKey++) {
              var subKey = subKeys[nSubKey] = [];
              var bitShift = BIT_SHIFTS[nSubKey];
              for (var i = 0; i < 24; i++) {
                subKey[i / 6 | 0] |= keyBits[(PC2[i] - 1 + bitShift) % 28] << 31 - i % 6;
                subKey[4 + (i / 6 | 0)] |= keyBits[28 + (PC2[i + 24] - 1 + bitShift) % 28] << 31 - i % 6;
              }
              subKey[0] = subKey[0] << 1 | subKey[0] >>> 31;
              for (var i = 1; i < 7; i++) {
                subKey[i] = subKey[i] >>> (i - 1) * 4 + 3;
              }
              subKey[7] = subKey[7] << 5 | subKey[7] >>> 27;
            }
            var invSubKeys = this._invSubKeys = [];
            for (var i = 0; i < 16; i++) {
              invSubKeys[i] = subKeys[15 - i];
            }
          },
          encryptBlock: function(M, offset) {
            this._doCryptBlock(M, offset, this._subKeys);
          },
          decryptBlock: function(M, offset) {
            this._doCryptBlock(M, offset, this._invSubKeys);
          },
          _doCryptBlock: function(M, offset, subKeys) {
            this._lBlock = M[offset];
            this._rBlock = M[offset + 1];
            exchangeLR.call(this, 4, 252645135);
            exchangeLR.call(this, 16, 65535);
            exchangeRL.call(this, 2, 858993459);
            exchangeRL.call(this, 8, 16711935);
            exchangeLR.call(this, 1, 1431655765);
            for (var round = 0; round < 16; round++) {
              var subKey = subKeys[round];
              var lBlock = this._lBlock;
              var rBlock = this._rBlock;
              var f = 0;
              for (var i = 0; i < 8; i++) {
                f |= SBOX_P[i][((rBlock ^ subKey[i]) & SBOX_MASK[i]) >>> 0];
              }
              this._lBlock = rBlock;
              this._rBlock = lBlock ^ f;
            }
            var t = this._lBlock;
            this._lBlock = this._rBlock;
            this._rBlock = t;
            exchangeLR.call(this, 1, 1431655765);
            exchangeRL.call(this, 8, 16711935);
            exchangeRL.call(this, 2, 858993459);
            exchangeLR.call(this, 16, 65535);
            exchangeLR.call(this, 4, 252645135);
            M[offset] = this._lBlock;
            M[offset + 1] = this._rBlock;
          },
          keySize: 64 / 32,
          ivSize: 64 / 32,
          blockSize: 64 / 32
        });
        function exchangeLR(offset, mask) {
          var t = (this._lBlock >>> offset ^ this._rBlock) & mask;
          this._rBlock ^= t;
          this._lBlock ^= t << offset;
        }
        function exchangeRL(offset, mask) {
          var t = (this._rBlock >>> offset ^ this._lBlock) & mask;
          this._lBlock ^= t;
          this._rBlock ^= t << offset;
        }
        C.DES = BlockCipher._createHelper(DES);
        var TripleDES = C_algo.TripleDES = BlockCipher.extend({
          _doReset: function() {
            var key = this._key;
            var keyWords = key.words;
            if (keyWords.length !== 2 && keyWords.length !== 4 && keyWords.length < 6) {
              throw new Error("Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.");
            }
            var key1 = keyWords.slice(0, 2);
            var key2 = keyWords.length < 4 ? keyWords.slice(0, 2) : keyWords.slice(2, 4);
            var key3 = keyWords.length < 6 ? keyWords.slice(0, 2) : keyWords.slice(4, 6);
            this._des1 = DES.createEncryptor(WordArray.create(key1));
            this._des2 = DES.createEncryptor(WordArray.create(key2));
            this._des3 = DES.createEncryptor(WordArray.create(key3));
          },
          encryptBlock: function(M, offset) {
            this._des1.encryptBlock(M, offset);
            this._des2.decryptBlock(M, offset);
            this._des3.encryptBlock(M, offset);
          },
          decryptBlock: function(M, offset) {
            this._des3.decryptBlock(M, offset);
            this._des2.encryptBlock(M, offset);
            this._des1.decryptBlock(M, offset);
          },
          keySize: 192 / 32,
          ivSize: 64 / 32,
          blockSize: 64 / 32
        });
        C.TripleDES = BlockCipher._createHelper(TripleDES);
      })();
      return CryptoJS.TripleDES;
    });
  }
});

// node_modules/crypto-js/rc4.js
var require_rc4 = __commonJS({
  "node_modules/crypto-js/rc4.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_enc_base64(), require_md5(), require_evpkdf(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var StreamCipher = C_lib.StreamCipher;
        var C_algo = C.algo;
        var RC4 = C_algo.RC4 = StreamCipher.extend({
          _doReset: function() {
            var key = this._key;
            var keyWords = key.words;
            var keySigBytes = key.sigBytes;
            var S = this._S = [];
            for (var i = 0; i < 256; i++) {
              S[i] = i;
            }
            for (var i = 0, j = 0; i < 256; i++) {
              var keyByteIndex = i % keySigBytes;
              var keyByte = keyWords[keyByteIndex >>> 2] >>> 24 - keyByteIndex % 4 * 8 & 255;
              j = (j + S[i] + keyByte) % 256;
              var t = S[i];
              S[i] = S[j];
              S[j] = t;
            }
            this._i = this._j = 0;
          },
          _doProcessBlock: function(M, offset) {
            M[offset] ^= generateKeystreamWord.call(this);
          },
          keySize: 256 / 32,
          ivSize: 0
        });
        function generateKeystreamWord() {
          var S = this._S;
          var i = this._i;
          var j = this._j;
          var keystreamWord = 0;
          for (var n = 0; n < 4; n++) {
            i = (i + 1) % 256;
            j = (j + S[i]) % 256;
            var t = S[i];
            S[i] = S[j];
            S[j] = t;
            keystreamWord |= S[(S[i] + S[j]) % 256] << 24 - n * 8;
          }
          this._i = i;
          this._j = j;
          return keystreamWord;
        }
        C.RC4 = StreamCipher._createHelper(RC4);
        var RC4Drop = C_algo.RC4Drop = RC4.extend({
          cfg: RC4.cfg.extend({
            drop: 192
          }),
          _doReset: function() {
            RC4._doReset.call(this);
            for (var i = this.cfg.drop; i > 0; i--) {
              generateKeystreamWord.call(this);
            }
          }
        });
        C.RC4Drop = StreamCipher._createHelper(RC4Drop);
      })();
      return CryptoJS.RC4;
    });
  }
});

// node_modules/crypto-js/rabbit.js
var require_rabbit = __commonJS({
  "node_modules/crypto-js/rabbit.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_enc_base64(), require_md5(), require_evpkdf(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var StreamCipher = C_lib.StreamCipher;
        var C_algo = C.algo;
        var S = [];
        var C_ = [];
        var G = [];
        var Rabbit = C_algo.Rabbit = StreamCipher.extend({
          _doReset: function() {
            var K = this._key.words;
            var iv = this.cfg.iv;
            for (var i = 0; i < 4; i++) {
              K[i] = (K[i] << 8 | K[i] >>> 24) & 16711935 | (K[i] << 24 | K[i] >>> 8) & 4278255360;
            }
            var X = this._X = [
              K[0],
              K[3] << 16 | K[2] >>> 16,
              K[1],
              K[0] << 16 | K[3] >>> 16,
              K[2],
              K[1] << 16 | K[0] >>> 16,
              K[3],
              K[2] << 16 | K[1] >>> 16
            ];
            var C2 = this._C = [
              K[2] << 16 | K[2] >>> 16,
              K[0] & 4294901760 | K[1] & 65535,
              K[3] << 16 | K[3] >>> 16,
              K[1] & 4294901760 | K[2] & 65535,
              K[0] << 16 | K[0] >>> 16,
              K[2] & 4294901760 | K[3] & 65535,
              K[1] << 16 | K[1] >>> 16,
              K[3] & 4294901760 | K[0] & 65535
            ];
            this._b = 0;
            for (var i = 0; i < 4; i++) {
              nextState.call(this);
            }
            for (var i = 0; i < 8; i++) {
              C2[i] ^= X[i + 4 & 7];
            }
            if (iv) {
              var IV = iv.words;
              var IV_0 = IV[0];
              var IV_1 = IV[1];
              var i0 = (IV_0 << 8 | IV_0 >>> 24) & 16711935 | (IV_0 << 24 | IV_0 >>> 8) & 4278255360;
              var i2 = (IV_1 << 8 | IV_1 >>> 24) & 16711935 | (IV_1 << 24 | IV_1 >>> 8) & 4278255360;
              var i1 = i0 >>> 16 | i2 & 4294901760;
              var i3 = i2 << 16 | i0 & 65535;
              C2[0] ^= i0;
              C2[1] ^= i1;
              C2[2] ^= i2;
              C2[3] ^= i3;
              C2[4] ^= i0;
              C2[5] ^= i1;
              C2[6] ^= i2;
              C2[7] ^= i3;
              for (var i = 0; i < 4; i++) {
                nextState.call(this);
              }
            }
          },
          _doProcessBlock: function(M, offset) {
            var X = this._X;
            nextState.call(this);
            S[0] = X[0] ^ X[5] >>> 16 ^ X[3] << 16;
            S[1] = X[2] ^ X[7] >>> 16 ^ X[5] << 16;
            S[2] = X[4] ^ X[1] >>> 16 ^ X[7] << 16;
            S[3] = X[6] ^ X[3] >>> 16 ^ X[1] << 16;
            for (var i = 0; i < 4; i++) {
              S[i] = (S[i] << 8 | S[i] >>> 24) & 16711935 | (S[i] << 24 | S[i] >>> 8) & 4278255360;
              M[offset + i] ^= S[i];
            }
          },
          blockSize: 128 / 32,
          ivSize: 64 / 32
        });
        function nextState() {
          var X = this._X;
          var C2 = this._C;
          for (var i = 0; i < 8; i++) {
            C_[i] = C2[i];
          }
          C2[0] = C2[0] + 1295307597 + this._b | 0;
          C2[1] = C2[1] + 3545052371 + (C2[0] >>> 0 < C_[0] >>> 0 ? 1 : 0) | 0;
          C2[2] = C2[2] + 886263092 + (C2[1] >>> 0 < C_[1] >>> 0 ? 1 : 0) | 0;
          C2[3] = C2[3] + 1295307597 + (C2[2] >>> 0 < C_[2] >>> 0 ? 1 : 0) | 0;
          C2[4] = C2[4] + 3545052371 + (C2[3] >>> 0 < C_[3] >>> 0 ? 1 : 0) | 0;
          C2[5] = C2[5] + 886263092 + (C2[4] >>> 0 < C_[4] >>> 0 ? 1 : 0) | 0;
          C2[6] = C2[6] + 1295307597 + (C2[5] >>> 0 < C_[5] >>> 0 ? 1 : 0) | 0;
          C2[7] = C2[7] + 3545052371 + (C2[6] >>> 0 < C_[6] >>> 0 ? 1 : 0) | 0;
          this._b = C2[7] >>> 0 < C_[7] >>> 0 ? 1 : 0;
          for (var i = 0; i < 8; i++) {
            var gx = X[i] + C2[i];
            var ga = gx & 65535;
            var gb = gx >>> 16;
            var gh = ((ga * ga >>> 17) + ga * gb >>> 15) + gb * gb;
            var gl = ((gx & 4294901760) * gx | 0) + ((gx & 65535) * gx | 0);
            G[i] = gh ^ gl;
          }
          X[0] = G[0] + (G[7] << 16 | G[7] >>> 16) + (G[6] << 16 | G[6] >>> 16) | 0;
          X[1] = G[1] + (G[0] << 8 | G[0] >>> 24) + G[7] | 0;
          X[2] = G[2] + (G[1] << 16 | G[1] >>> 16) + (G[0] << 16 | G[0] >>> 16) | 0;
          X[3] = G[3] + (G[2] << 8 | G[2] >>> 24) + G[1] | 0;
          X[4] = G[4] + (G[3] << 16 | G[3] >>> 16) + (G[2] << 16 | G[2] >>> 16) | 0;
          X[5] = G[5] + (G[4] << 8 | G[4] >>> 24) + G[3] | 0;
          X[6] = G[6] + (G[5] << 16 | G[5] >>> 16) + (G[4] << 16 | G[4] >>> 16) | 0;
          X[7] = G[7] + (G[6] << 8 | G[6] >>> 24) + G[5] | 0;
        }
        C.Rabbit = StreamCipher._createHelper(Rabbit);
      })();
      return CryptoJS.Rabbit;
    });
  }
});

// node_modules/crypto-js/rabbit-legacy.js
var require_rabbit_legacy = __commonJS({
  "node_modules/crypto-js/rabbit-legacy.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_enc_base64(), require_md5(), require_evpkdf(), require_cipher_core());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./enc-base64", "./md5", "./evpkdf", "./cipher-core"], factory);
      } else {
        factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      (function() {
        var C = CryptoJS;
        var C_lib = C.lib;
        var StreamCipher = C_lib.StreamCipher;
        var C_algo = C.algo;
        var S = [];
        var C_ = [];
        var G = [];
        var RabbitLegacy = C_algo.RabbitLegacy = StreamCipher.extend({
          _doReset: function() {
            var K = this._key.words;
            var iv = this.cfg.iv;
            var X = this._X = [
              K[0],
              K[3] << 16 | K[2] >>> 16,
              K[1],
              K[0] << 16 | K[3] >>> 16,
              K[2],
              K[1] << 16 | K[0] >>> 16,
              K[3],
              K[2] << 16 | K[1] >>> 16
            ];
            var C2 = this._C = [
              K[2] << 16 | K[2] >>> 16,
              K[0] & 4294901760 | K[1] & 65535,
              K[3] << 16 | K[3] >>> 16,
              K[1] & 4294901760 | K[2] & 65535,
              K[0] << 16 | K[0] >>> 16,
              K[2] & 4294901760 | K[3] & 65535,
              K[1] << 16 | K[1] >>> 16,
              K[3] & 4294901760 | K[0] & 65535
            ];
            this._b = 0;
            for (var i = 0; i < 4; i++) {
              nextState.call(this);
            }
            for (var i = 0; i < 8; i++) {
              C2[i] ^= X[i + 4 & 7];
            }
            if (iv) {
              var IV = iv.words;
              var IV_0 = IV[0];
              var IV_1 = IV[1];
              var i0 = (IV_0 << 8 | IV_0 >>> 24) & 16711935 | (IV_0 << 24 | IV_0 >>> 8) & 4278255360;
              var i2 = (IV_1 << 8 | IV_1 >>> 24) & 16711935 | (IV_1 << 24 | IV_1 >>> 8) & 4278255360;
              var i1 = i0 >>> 16 | i2 & 4294901760;
              var i3 = i2 << 16 | i0 & 65535;
              C2[0] ^= i0;
              C2[1] ^= i1;
              C2[2] ^= i2;
              C2[3] ^= i3;
              C2[4] ^= i0;
              C2[5] ^= i1;
              C2[6] ^= i2;
              C2[7] ^= i3;
              for (var i = 0; i < 4; i++) {
                nextState.call(this);
              }
            }
          },
          _doProcessBlock: function(M, offset) {
            var X = this._X;
            nextState.call(this);
            S[0] = X[0] ^ X[5] >>> 16 ^ X[3] << 16;
            S[1] = X[2] ^ X[7] >>> 16 ^ X[5] << 16;
            S[2] = X[4] ^ X[1] >>> 16 ^ X[7] << 16;
            S[3] = X[6] ^ X[3] >>> 16 ^ X[1] << 16;
            for (var i = 0; i < 4; i++) {
              S[i] = (S[i] << 8 | S[i] >>> 24) & 16711935 | (S[i] << 24 | S[i] >>> 8) & 4278255360;
              M[offset + i] ^= S[i];
            }
          },
          blockSize: 128 / 32,
          ivSize: 64 / 32
        });
        function nextState() {
          var X = this._X;
          var C2 = this._C;
          for (var i = 0; i < 8; i++) {
            C_[i] = C2[i];
          }
          C2[0] = C2[0] + 1295307597 + this._b | 0;
          C2[1] = C2[1] + 3545052371 + (C2[0] >>> 0 < C_[0] >>> 0 ? 1 : 0) | 0;
          C2[2] = C2[2] + 886263092 + (C2[1] >>> 0 < C_[1] >>> 0 ? 1 : 0) | 0;
          C2[3] = C2[3] + 1295307597 + (C2[2] >>> 0 < C_[2] >>> 0 ? 1 : 0) | 0;
          C2[4] = C2[4] + 3545052371 + (C2[3] >>> 0 < C_[3] >>> 0 ? 1 : 0) | 0;
          C2[5] = C2[5] + 886263092 + (C2[4] >>> 0 < C_[4] >>> 0 ? 1 : 0) | 0;
          C2[6] = C2[6] + 1295307597 + (C2[5] >>> 0 < C_[5] >>> 0 ? 1 : 0) | 0;
          C2[7] = C2[7] + 3545052371 + (C2[6] >>> 0 < C_[6] >>> 0 ? 1 : 0) | 0;
          this._b = C2[7] >>> 0 < C_[7] >>> 0 ? 1 : 0;
          for (var i = 0; i < 8; i++) {
            var gx = X[i] + C2[i];
            var ga = gx & 65535;
            var gb = gx >>> 16;
            var gh = ((ga * ga >>> 17) + ga * gb >>> 15) + gb * gb;
            var gl = ((gx & 4294901760) * gx | 0) + ((gx & 65535) * gx | 0);
            G[i] = gh ^ gl;
          }
          X[0] = G[0] + (G[7] << 16 | G[7] >>> 16) + (G[6] << 16 | G[6] >>> 16) | 0;
          X[1] = G[1] + (G[0] << 8 | G[0] >>> 24) + G[7] | 0;
          X[2] = G[2] + (G[1] << 16 | G[1] >>> 16) + (G[0] << 16 | G[0] >>> 16) | 0;
          X[3] = G[3] + (G[2] << 8 | G[2] >>> 24) + G[1] | 0;
          X[4] = G[4] + (G[3] << 16 | G[3] >>> 16) + (G[2] << 16 | G[2] >>> 16) | 0;
          X[5] = G[5] + (G[4] << 8 | G[4] >>> 24) + G[3] | 0;
          X[6] = G[6] + (G[5] << 16 | G[5] >>> 16) + (G[4] << 16 | G[4] >>> 16) | 0;
          X[7] = G[7] + (G[6] << 8 | G[6] >>> 24) + G[5] | 0;
        }
        C.RabbitLegacy = StreamCipher._createHelper(RabbitLegacy);
      })();
      return CryptoJS.RabbitLegacy;
    });
  }
});

// node_modules/crypto-js/index.js
var require_crypto_js = __commonJS({
  "node_modules/crypto-js/index.js"(exports2, module2) {
    init_shims();
    (function(root, factory, undef) {
      if (typeof exports2 === "object") {
        module2.exports = exports2 = factory(require_core(), require_x64_core(), require_lib_typedarrays(), require_enc_utf16(), require_enc_base64(), require_enc_base64url(), require_md5(), require_sha1(), require_sha256(), require_sha224(), require_sha512(), require_sha384(), require_sha3(), require_ripemd160(), require_hmac(), require_pbkdf2(), require_evpkdf(), require_cipher_core(), require_mode_cfb(), require_mode_ctr(), require_mode_ctr_gladman(), require_mode_ofb(), require_mode_ecb(), require_pad_ansix923(), require_pad_iso10126(), require_pad_iso97971(), require_pad_zeropadding(), require_pad_nopadding(), require_format_hex(), require_aes(), require_tripledes(), require_rc4(), require_rabbit(), require_rabbit_legacy());
      } else if (typeof define === "function" && define.amd) {
        define(["./core", "./x64-core", "./lib-typedarrays", "./enc-utf16", "./enc-base64", "./enc-base64url", "./md5", "./sha1", "./sha256", "./sha224", "./sha512", "./sha384", "./sha3", "./ripemd160", "./hmac", "./pbkdf2", "./evpkdf", "./cipher-core", "./mode-cfb", "./mode-ctr", "./mode-ctr-gladman", "./mode-ofb", "./mode-ecb", "./pad-ansix923", "./pad-iso10126", "./pad-iso97971", "./pad-zeropadding", "./pad-nopadding", "./format-hex", "./aes", "./tripledes", "./rc4", "./rabbit", "./rabbit-legacy"], factory);
      } else {
        root.CryptoJS = factory(root.CryptoJS);
      }
    })(exports2, function(CryptoJS) {
      return CryptoJS;
    });
  }
});

// node_modules/object-resolve-path/path.js
var require_path = __commonJS({
  "node_modules/object-resolve-path/path.js"(exports2, module2) {
    init_shims();
    function noop2() {
    }
    function detectEval() {
      if (typeof chrome !== "undefined" && chrome.app && chrome.app.runtime) {
        return false;
      }
      if (typeof navigator != "undefined" && navigator.getDeviceStorage) {
        return false;
      }
      try {
        var f = new Function("", "return true;");
        return f();
      } catch (ex) {
        return false;
      }
    }
    var hasEval = detectEval();
    function isIndex(s2) {
      return +s2 === s2 >>> 0 && s2 !== "";
    }
    function isObject(obj) {
      return obj === Object(obj);
    }
    var createObject = "__proto__" in {} ? function(obj) {
      return obj;
    } : function(obj) {
      var proto = obj.__proto__;
      if (!proto)
        return obj;
      var newObject = Object.create(proto);
      Object.getOwnPropertyNames(obj).forEach(function(name) {
        Object.defineProperty(newObject, name, Object.getOwnPropertyDescriptor(obj, name));
      });
      return newObject;
    };
    function parsePath(path) {
      var keys = [];
      var index2 = -1;
      var c, newChar, key, type, transition, action, typeMap, mode = "beforePath";
      var actions = {
        push: function() {
          if (key === void 0)
            return;
          keys.push(key);
          key = void 0;
        },
        append: function() {
          if (key === void 0)
            key = newChar;
          else
            key += newChar;
        }
      };
      function maybeUnescapeQuote() {
        if (index2 >= path.length)
          return;
        var nextChar = path[index2 + 1];
        if (mode == "inSingleQuote" && nextChar == "'" || mode == "inDoubleQuote" && nextChar == '"') {
          index2++;
          newChar = nextChar;
          actions.append();
          return true;
        }
      }
      while (mode) {
        index2++;
        c = path[index2];
        if (c == "\\" && maybeUnescapeQuote(mode))
          continue;
        type = getPathCharType(c);
        typeMap = pathStateMachine[mode];
        transition = typeMap[type] || typeMap["else"] || "error";
        if (transition == "error")
          return;
        mode = transition[0];
        action = actions[transition[1]] || noop2;
        newChar = transition[2] === void 0 ? c : transition[2];
        action();
        if (mode === "afterPath") {
          return keys;
        }
      }
      return;
    }
    var identStart = "[$_a-zA-Z]";
    var identPart = "[$_a-zA-Z0-9]";
    var identRegExp = new RegExp("^" + identStart + "+" + identPart + "*$");
    function isIdent(s2) {
      return identRegExp.test(s2);
    }
    var constructorIsPrivate = {};
    function Path(parts, privateToken) {
      if (privateToken !== constructorIsPrivate)
        throw Error("Use Path.get to retrieve path objects");
      for (var i = 0; i < parts.length; i++) {
        this.push(String(parts[i]));
      }
      if (hasEval && this.length) {
        this.getValueFrom = this.compiledGetValueFromFn();
      }
    }
    var pathCache = {};
    function getPath(pathString) {
      if (pathString instanceof Path)
        return pathString;
      if (pathString == null || pathString.length == 0)
        pathString = "";
      if (typeof pathString != "string") {
        if (isIndex(pathString.length)) {
          return new Path(pathString, constructorIsPrivate);
        }
        pathString = String(pathString);
      }
      var path = pathCache[pathString];
      if (path)
        return path;
      var parts = parsePath(pathString);
      if (!parts)
        return invalidPath;
      var path = new Path(parts, constructorIsPrivate);
      pathCache[pathString] = path;
      return path;
    }
    Path.get = getPath;
    function formatAccessor(key) {
      if (isIndex(key)) {
        return "[" + key + "]";
      } else {
        return '["' + key.replace(/"/g, '\\"') + '"]';
      }
    }
    Path.prototype = createObject({
      __proto__: [],
      valid: true,
      toString: function() {
        var pathString = "";
        for (var i = 0; i < this.length; i++) {
          var key = this[i];
          if (isIdent(key)) {
            pathString += i ? "." + key : key;
          } else {
            pathString += formatAccessor(key);
          }
        }
        return pathString;
      },
      getValueFrom: function(obj, directObserver) {
        for (var i = 0; i < this.length; i++) {
          if (obj == null)
            return;
          obj = obj[this[i]];
        }
        return obj;
      },
      iterateObjects: function(obj, observe) {
        for (var i = 0; i < this.length; i++) {
          if (i)
            obj = obj[this[i - 1]];
          if (!isObject(obj))
            return;
          observe(obj, this[i]);
        }
      },
      compiledGetValueFromFn: function() {
        var str = "";
        var pathString = "obj";
        str += "if (obj != null";
        var i = 0;
        var key;
        for (; i < this.length - 1; i++) {
          key = this[i];
          pathString += isIdent(key) ? "." + key : formatAccessor(key);
          str += " &&\n     " + pathString + " != null";
        }
        str += ")\n";
        var key = this[i];
        pathString += isIdent(key) ? "." + key : formatAccessor(key);
        str += "  return " + pathString + ";\nelse\n  return undefined;";
        return new Function("obj", str);
      },
      setValueFrom: function(obj, value) {
        if (!this.length)
          return false;
        for (var i = 0; i < this.length - 1; i++) {
          if (!isObject(obj))
            return false;
          obj = obj[this[i]];
        }
        if (!isObject(obj))
          return false;
        obj[this[i]] = value;
        return true;
      }
    });
    function getPathCharType(char) {
      if (char === void 0)
        return "eof";
      var code = char.charCodeAt(0);
      switch (code) {
        case 91:
        case 93:
        case 46:
        case 34:
        case 39:
        case 48:
          return char;
        case 95:
        case 36:
          return "ident";
        case 32:
        case 9:
        case 10:
        case 13:
        case 160:
        case 65279:
        case 8232:
        case 8233:
          return "ws";
      }
      if (97 <= code && code <= 122 || 65 <= code && code <= 90)
        return "ident";
      if (49 <= code && code <= 57)
        return "number";
      return "else";
    }
    var pathStateMachine = {
      "beforePath": {
        "ws": ["beforePath"],
        "ident": ["inIdent", "append"],
        "[": ["beforeElement"],
        "eof": ["afterPath"]
      },
      "inPath": {
        "ws": ["inPath"],
        ".": ["beforeIdent"],
        "[": ["beforeElement"],
        "eof": ["afterPath"]
      },
      "beforeIdent": {
        "ws": ["beforeIdent"],
        "ident": ["inIdent", "append"]
      },
      "inIdent": {
        "ident": ["inIdent", "append"],
        "0": ["inIdent", "append"],
        "number": ["inIdent", "append"],
        "ws": ["inPath", "push"],
        ".": ["beforeIdent", "push"],
        "[": ["beforeElement", "push"],
        "eof": ["afterPath", "push"]
      },
      "beforeElement": {
        "ws": ["beforeElement"],
        "0": ["afterZero", "append"],
        "number": ["inIndex", "append"],
        "'": ["inSingleQuote", "append", ""],
        '"': ["inDoubleQuote", "append", ""]
      },
      "afterZero": {
        "ws": ["afterElement", "push"],
        "]": ["inPath", "push"]
      },
      "inIndex": {
        "0": ["inIndex", "append"],
        "number": ["inIndex", "append"],
        "ws": ["afterElement"],
        "]": ["inPath", "push"]
      },
      "inSingleQuote": {
        "'": ["afterElement"],
        "eof": ["error"],
        "else": ["inSingleQuote", "append"]
      },
      "inDoubleQuote": {
        '"': ["afterElement"],
        "eof": ["error"],
        "else": ["inDoubleQuote", "append"]
      },
      "afterElement": {
        "ws": ["afterElement"],
        "]": ["inPath", "push"]
      }
    };
    var invalidPath = new Path("", constructorIsPrivate);
    invalidPath.valid = false;
    invalidPath.getValueFrom = invalidPath.setValueFrom = function() {
    };
    module2.exports = Path;
  }
});

// node_modules/object-resolve-path/object-resolve-path.js
var require_object_resolve_path = __commonJS({
  "node_modules/object-resolve-path/object-resolve-path.js"(exports2, module2) {
    init_shims();
    var Path = require_path();
    module2.exports = function(o, path) {
      if (typeof path !== "string") {
        throw new TypeError("path must be a string");
      }
      if (typeof o !== "object") {
        throw new TypeError("object must be passed");
      }
      var pathObj = Path.get(path);
      if (!pathObj.valid) {
        throw new Error("path is not a valid object path");
      }
      return pathObj.getValueFrom(o);
    };
  }
});

// node_modules/bottleneck/lib/parser.js
var require_parser = __commonJS({
  "node_modules/bottleneck/lib/parser.js"(exports2) {
    init_shims();
    "use strict";
    exports2.load = function(received, defaults2, onto = {}) {
      var k, ref, v;
      for (k in defaults2) {
        v = defaults2[k];
        onto[k] = (ref = received[k]) != null ? ref : v;
      }
      return onto;
    };
    exports2.overwrite = function(received, defaults2, onto = {}) {
      var k, v;
      for (k in received) {
        v = received[k];
        if (defaults2[k] !== void 0) {
          onto[k] = v;
        }
      }
      return onto;
    };
  }
});

// node_modules/bottleneck/lib/DLList.js
var require_DLList = __commonJS({
  "node_modules/bottleneck/lib/DLList.js"(exports2, module2) {
    init_shims();
    "use strict";
    var DLList;
    DLList = class DLList {
      constructor(incr, decr) {
        this.incr = incr;
        this.decr = decr;
        this._first = null;
        this._last = null;
        this.length = 0;
      }
      push(value) {
        var node;
        this.length++;
        if (typeof this.incr === "function") {
          this.incr();
        }
        node = {
          value,
          prev: this._last,
          next: null
        };
        if (this._last != null) {
          this._last.next = node;
          this._last = node;
        } else {
          this._first = this._last = node;
        }
        return void 0;
      }
      shift() {
        var value;
        if (this._first == null) {
          return;
        } else {
          this.length--;
          if (typeof this.decr === "function") {
            this.decr();
          }
        }
        value = this._first.value;
        if ((this._first = this._first.next) != null) {
          this._first.prev = null;
        } else {
          this._last = null;
        }
        return value;
      }
      first() {
        if (this._first != null) {
          return this._first.value;
        }
      }
      getArray() {
        var node, ref, results;
        node = this._first;
        results = [];
        while (node != null) {
          results.push((ref = node, node = node.next, ref.value));
        }
        return results;
      }
      forEachShift(cb) {
        var node;
        node = this.shift();
        while (node != null) {
          cb(node), node = this.shift();
        }
        return void 0;
      }
      debug() {
        var node, ref, ref1, ref2, results;
        node = this._first;
        results = [];
        while (node != null) {
          results.push((ref = node, node = node.next, {
            value: ref.value,
            prev: (ref1 = ref.prev) != null ? ref1.value : void 0,
            next: (ref2 = ref.next) != null ? ref2.value : void 0
          }));
        }
        return results;
      }
    };
    module2.exports = DLList;
  }
});

// node_modules/bottleneck/lib/Events.js
var require_Events = __commonJS({
  "node_modules/bottleneck/lib/Events.js"(exports2, module2) {
    init_shims();
    "use strict";
    function asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator2(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var Events2;
    Events2 = class Events {
      constructor(instance) {
        this.instance = instance;
        this._events = {};
        if (this.instance.on != null || this.instance.once != null || this.instance.removeAllListeners != null) {
          throw new Error("An Emitter already exists for this object");
        }
        this.instance.on = (name, cb) => {
          return this._addListener(name, "many", cb);
        };
        this.instance.once = (name, cb) => {
          return this._addListener(name, "once", cb);
        };
        this.instance.removeAllListeners = (name = null) => {
          if (name != null) {
            return delete this._events[name];
          } else {
            return this._events = {};
          }
        };
      }
      _addListener(name, status, cb) {
        var base2;
        if ((base2 = this._events)[name] == null) {
          base2[name] = [];
        }
        this._events[name].push({
          cb,
          status
        });
        return this.instance;
      }
      listenerCount(name) {
        if (this._events[name] != null) {
          return this._events[name].length;
        } else {
          return 0;
        }
      }
      trigger(name, ...args) {
        var _this = this;
        return _asyncToGenerator2(function* () {
          var e, promises;
          try {
            if (name !== "debug") {
              _this.trigger("debug", `Event triggered: ${name}`, args);
            }
            if (_this._events[name] == null) {
              return;
            }
            _this._events[name] = _this._events[name].filter(function(listener) {
              return listener.status !== "none";
            });
            promises = _this._events[name].map(/* @__PURE__ */ function() {
              var _ref = _asyncToGenerator2(function* (listener) {
                var e2, returned;
                if (listener.status === "none") {
                  return;
                }
                if (listener.status === "once") {
                  listener.status = "none";
                }
                try {
                  returned = typeof listener.cb === "function" ? listener.cb(...args) : void 0;
                  if (typeof (returned != null ? returned.then : void 0) === "function") {
                    return yield returned;
                  } else {
                    return returned;
                  }
                } catch (error2) {
                  e2 = error2;
                  if (true) {
                    _this.trigger("error", e2);
                  }
                  return null;
                }
              });
              return function(_x) {
                return _ref.apply(this, arguments);
              };
            }());
            return (yield Promise.all(promises)).find(function(x) {
              return x != null;
            });
          } catch (error2) {
            e = error2;
            if (true) {
              _this.trigger("error", e);
            }
            return null;
          }
        })();
      }
    };
    module2.exports = Events2;
  }
});

// node_modules/bottleneck/lib/Queues.js
var require_Queues = __commonJS({
  "node_modules/bottleneck/lib/Queues.js"(exports2, module2) {
    init_shims();
    "use strict";
    var DLList;
    var Events2;
    var Queues;
    DLList = require_DLList();
    Events2 = require_Events();
    Queues = class Queues {
      constructor(num_priorities) {
        var i;
        this.Events = new Events2(this);
        this._length = 0;
        this._lists = function() {
          var j, ref, results;
          results = [];
          for (i = j = 1, ref = num_priorities; 1 <= ref ? j <= ref : j >= ref; i = 1 <= ref ? ++j : --j) {
            results.push(new DLList(() => {
              return this.incr();
            }, () => {
              return this.decr();
            }));
          }
          return results;
        }.call(this);
      }
      incr() {
        if (this._length++ === 0) {
          return this.Events.trigger("leftzero");
        }
      }
      decr() {
        if (--this._length === 0) {
          return this.Events.trigger("zero");
        }
      }
      push(job) {
        return this._lists[job.options.priority].push(job);
      }
      queued(priority) {
        if (priority != null) {
          return this._lists[priority].length;
        } else {
          return this._length;
        }
      }
      shiftAll(fn) {
        return this._lists.forEach(function(list) {
          return list.forEachShift(fn);
        });
      }
      getFirst(arr = this._lists) {
        var j, len, list;
        for (j = 0, len = arr.length; j < len; j++) {
          list = arr[j];
          if (list.length > 0) {
            return list;
          }
        }
        return [];
      }
      shiftLastFrom(priority) {
        return this.getFirst(this._lists.slice(priority).reverse()).shift();
      }
    };
    module2.exports = Queues;
  }
});

// node_modules/bottleneck/lib/BottleneckError.js
var require_BottleneckError = __commonJS({
  "node_modules/bottleneck/lib/BottleneckError.js"(exports2, module2) {
    init_shims();
    "use strict";
    var BottleneckError;
    BottleneckError = class BottleneckError extends Error {
    };
    module2.exports = BottleneckError;
  }
});

// node_modules/bottleneck/lib/Job.js
var require_Job = __commonJS({
  "node_modules/bottleneck/lib/Job.js"(exports2, module2) {
    init_shims();
    "use strict";
    function asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator2(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var BottleneckError;
    var DEFAULT_PRIORITY;
    var Job;
    var NUM_PRIORITIES;
    var parser2;
    NUM_PRIORITIES = 10;
    DEFAULT_PRIORITY = 5;
    parser2 = require_parser();
    BottleneckError = require_BottleneckError();
    Job = class Job {
      constructor(task, args, options3, jobDefaults, rejectOnDrop, Events2, _states, Promise2) {
        this.task = task;
        this.args = args;
        this.rejectOnDrop = rejectOnDrop;
        this.Events = Events2;
        this._states = _states;
        this.Promise = Promise2;
        this.options = parser2.load(options3, jobDefaults);
        this.options.priority = this._sanitizePriority(this.options.priority);
        if (this.options.id === jobDefaults.id) {
          this.options.id = `${this.options.id}-${this._randomIndex()}`;
        }
        this.promise = new this.Promise((_resolve, _reject) => {
          this._resolve = _resolve;
          this._reject = _reject;
        });
        this.retryCount = 0;
      }
      _sanitizePriority(priority) {
        var sProperty;
        sProperty = ~~priority !== priority ? DEFAULT_PRIORITY : priority;
        if (sProperty < 0) {
          return 0;
        } else if (sProperty > NUM_PRIORITIES - 1) {
          return NUM_PRIORITIES - 1;
        } else {
          return sProperty;
        }
      }
      _randomIndex() {
        return Math.random().toString(36).slice(2);
      }
      doDrop({
        error: error2,
        message = "This job has been dropped by Bottleneck"
      } = {}) {
        if (this._states.remove(this.options.id)) {
          if (this.rejectOnDrop) {
            this._reject(error2 != null ? error2 : new BottleneckError(message));
          }
          this.Events.trigger("dropped", {
            args: this.args,
            options: this.options,
            task: this.task,
            promise: this.promise
          });
          return true;
        } else {
          return false;
        }
      }
      _assertStatus(expected) {
        var status;
        status = this._states.jobStatus(this.options.id);
        if (!(status === expected || expected === "DONE" && status === null)) {
          throw new BottleneckError(`Invalid job status ${status}, expected ${expected}. Please open an issue at https://github.com/SGrondin/bottleneck/issues`);
        }
      }
      doReceive() {
        this._states.start(this.options.id);
        return this.Events.trigger("received", {
          args: this.args,
          options: this.options
        });
      }
      doQueue(reachedHWM, blocked) {
        this._assertStatus("RECEIVED");
        this._states.next(this.options.id);
        return this.Events.trigger("queued", {
          args: this.args,
          options: this.options,
          reachedHWM,
          blocked
        });
      }
      doRun() {
        if (this.retryCount === 0) {
          this._assertStatus("QUEUED");
          this._states.next(this.options.id);
        } else {
          this._assertStatus("EXECUTING");
        }
        return this.Events.trigger("scheduled", {
          args: this.args,
          options: this.options
        });
      }
      doExecute(chained, clearGlobalState, run2, free) {
        var _this = this;
        return _asyncToGenerator2(function* () {
          var error2, eventInfo, passed;
          if (_this.retryCount === 0) {
            _this._assertStatus("RUNNING");
            _this._states.next(_this.options.id);
          } else {
            _this._assertStatus("EXECUTING");
          }
          eventInfo = {
            args: _this.args,
            options: _this.options,
            retryCount: _this.retryCount
          };
          _this.Events.trigger("executing", eventInfo);
          try {
            passed = yield chained != null ? chained.schedule(_this.options, _this.task, ..._this.args) : _this.task(..._this.args);
            if (clearGlobalState()) {
              _this.doDone(eventInfo);
              yield free(_this.options, eventInfo);
              _this._assertStatus("DONE");
              return _this._resolve(passed);
            }
          } catch (error1) {
            error2 = error1;
            return _this._onFailure(error2, eventInfo, clearGlobalState, run2, free);
          }
        })();
      }
      doExpire(clearGlobalState, run2, free) {
        var error2, eventInfo;
        if (this._states.jobStatus(this.options.id === "RUNNING")) {
          this._states.next(this.options.id);
        }
        this._assertStatus("EXECUTING");
        eventInfo = {
          args: this.args,
          options: this.options,
          retryCount: this.retryCount
        };
        error2 = new BottleneckError(`This job timed out after ${this.options.expiration} ms.`);
        return this._onFailure(error2, eventInfo, clearGlobalState, run2, free);
      }
      _onFailure(error2, eventInfo, clearGlobalState, run2, free) {
        var _this2 = this;
        return _asyncToGenerator2(function* () {
          var retry, retryAfter;
          if (clearGlobalState()) {
            retry = yield _this2.Events.trigger("failed", error2, eventInfo);
            if (retry != null) {
              retryAfter = ~~retry;
              _this2.Events.trigger("retry", `Retrying ${_this2.options.id} after ${retryAfter} ms`, eventInfo);
              _this2.retryCount++;
              return run2(retryAfter);
            } else {
              _this2.doDone(eventInfo);
              yield free(_this2.options, eventInfo);
              _this2._assertStatus("DONE");
              return _this2._reject(error2);
            }
          }
        })();
      }
      doDone(eventInfo) {
        this._assertStatus("EXECUTING");
        this._states.next(this.options.id);
        return this.Events.trigger("done", eventInfo);
      }
    };
    module2.exports = Job;
  }
});

// node_modules/bottleneck/lib/LocalDatastore.js
var require_LocalDatastore = __commonJS({
  "node_modules/bottleneck/lib/LocalDatastore.js"(exports2, module2) {
    init_shims();
    "use strict";
    function asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator2(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var BottleneckError;
    var LocalDatastore;
    var parser2;
    parser2 = require_parser();
    BottleneckError = require_BottleneckError();
    LocalDatastore = class LocalDatastore {
      constructor(instance, storeOptions, storeInstanceOptions) {
        this.instance = instance;
        this.storeOptions = storeOptions;
        this.clientId = this.instance._randomIndex();
        parser2.load(storeInstanceOptions, storeInstanceOptions, this);
        this._nextRequest = this._lastReservoirRefresh = this._lastReservoirIncrease = Date.now();
        this._running = 0;
        this._done = 0;
        this._unblockTime = 0;
        this.ready = this.Promise.resolve();
        this.clients = {};
        this._startHeartbeat();
      }
      _startHeartbeat() {
        var base2;
        if (this.heartbeat == null && (this.storeOptions.reservoirRefreshInterval != null && this.storeOptions.reservoirRefreshAmount != null || this.storeOptions.reservoirIncreaseInterval != null && this.storeOptions.reservoirIncreaseAmount != null)) {
          return typeof (base2 = this.heartbeat = setInterval(() => {
            var amount, incr, maximum, now, reservoir;
            now = Date.now();
            if (this.storeOptions.reservoirRefreshInterval != null && now >= this._lastReservoirRefresh + this.storeOptions.reservoirRefreshInterval) {
              this._lastReservoirRefresh = now;
              this.storeOptions.reservoir = this.storeOptions.reservoirRefreshAmount;
              this.instance._drainAll(this.computeCapacity());
            }
            if (this.storeOptions.reservoirIncreaseInterval != null && now >= this._lastReservoirIncrease + this.storeOptions.reservoirIncreaseInterval) {
              var _this$storeOptions = this.storeOptions;
              amount = _this$storeOptions.reservoirIncreaseAmount;
              maximum = _this$storeOptions.reservoirIncreaseMaximum;
              reservoir = _this$storeOptions.reservoir;
              this._lastReservoirIncrease = now;
              incr = maximum != null ? Math.min(amount, maximum - reservoir) : amount;
              if (incr > 0) {
                this.storeOptions.reservoir += incr;
                return this.instance._drainAll(this.computeCapacity());
              }
            }
          }, this.heartbeatInterval)).unref === "function" ? base2.unref() : void 0;
        } else {
          return clearInterval(this.heartbeat);
        }
      }
      __publish__(message) {
        var _this = this;
        return _asyncToGenerator2(function* () {
          yield _this.yieldLoop();
          return _this.instance.Events.trigger("message", message.toString());
        })();
      }
      __disconnect__(flush) {
        var _this2 = this;
        return _asyncToGenerator2(function* () {
          yield _this2.yieldLoop();
          clearInterval(_this2.heartbeat);
          return _this2.Promise.resolve();
        })();
      }
      yieldLoop(t = 0) {
        return new this.Promise(function(resolve2, reject) {
          return setTimeout(resolve2, t);
        });
      }
      computePenalty() {
        var ref;
        return (ref = this.storeOptions.penalty) != null ? ref : 15 * this.storeOptions.minTime || 5e3;
      }
      __updateSettings__(options3) {
        var _this3 = this;
        return _asyncToGenerator2(function* () {
          yield _this3.yieldLoop();
          parser2.overwrite(options3, options3, _this3.storeOptions);
          _this3._startHeartbeat();
          _this3.instance._drainAll(_this3.computeCapacity());
          return true;
        })();
      }
      __running__() {
        var _this4 = this;
        return _asyncToGenerator2(function* () {
          yield _this4.yieldLoop();
          return _this4._running;
        })();
      }
      __queued__() {
        var _this5 = this;
        return _asyncToGenerator2(function* () {
          yield _this5.yieldLoop();
          return _this5.instance.queued();
        })();
      }
      __done__() {
        var _this6 = this;
        return _asyncToGenerator2(function* () {
          yield _this6.yieldLoop();
          return _this6._done;
        })();
      }
      __groupCheck__(time) {
        var _this7 = this;
        return _asyncToGenerator2(function* () {
          yield _this7.yieldLoop();
          return _this7._nextRequest + _this7.timeout < time;
        })();
      }
      computeCapacity() {
        var maxConcurrent, reservoir;
        var _this$storeOptions2 = this.storeOptions;
        maxConcurrent = _this$storeOptions2.maxConcurrent;
        reservoir = _this$storeOptions2.reservoir;
        if (maxConcurrent != null && reservoir != null) {
          return Math.min(maxConcurrent - this._running, reservoir);
        } else if (maxConcurrent != null) {
          return maxConcurrent - this._running;
        } else if (reservoir != null) {
          return reservoir;
        } else {
          return null;
        }
      }
      conditionsCheck(weight) {
        var capacity;
        capacity = this.computeCapacity();
        return capacity == null || weight <= capacity;
      }
      __incrementReservoir__(incr) {
        var _this8 = this;
        return _asyncToGenerator2(function* () {
          var reservoir;
          yield _this8.yieldLoop();
          reservoir = _this8.storeOptions.reservoir += incr;
          _this8.instance._drainAll(_this8.computeCapacity());
          return reservoir;
        })();
      }
      __currentReservoir__() {
        var _this9 = this;
        return _asyncToGenerator2(function* () {
          yield _this9.yieldLoop();
          return _this9.storeOptions.reservoir;
        })();
      }
      isBlocked(now) {
        return this._unblockTime >= now;
      }
      check(weight, now) {
        return this.conditionsCheck(weight) && this._nextRequest - now <= 0;
      }
      __check__(weight) {
        var _this10 = this;
        return _asyncToGenerator2(function* () {
          var now;
          yield _this10.yieldLoop();
          now = Date.now();
          return _this10.check(weight, now);
        })();
      }
      __register__(index2, weight, expiration) {
        var _this11 = this;
        return _asyncToGenerator2(function* () {
          var now, wait;
          yield _this11.yieldLoop();
          now = Date.now();
          if (_this11.conditionsCheck(weight)) {
            _this11._running += weight;
            if (_this11.storeOptions.reservoir != null) {
              _this11.storeOptions.reservoir -= weight;
            }
            wait = Math.max(_this11._nextRequest - now, 0);
            _this11._nextRequest = now + wait + _this11.storeOptions.minTime;
            return {
              success: true,
              wait,
              reservoir: _this11.storeOptions.reservoir
            };
          } else {
            return {
              success: false
            };
          }
        })();
      }
      strategyIsBlock() {
        return this.storeOptions.strategy === 3;
      }
      __submit__(queueLength, weight) {
        var _this12 = this;
        return _asyncToGenerator2(function* () {
          var blocked, now, reachedHWM;
          yield _this12.yieldLoop();
          if (_this12.storeOptions.maxConcurrent != null && weight > _this12.storeOptions.maxConcurrent) {
            throw new BottleneckError(`Impossible to add a job having a weight of ${weight} to a limiter having a maxConcurrent setting of ${_this12.storeOptions.maxConcurrent}`);
          }
          now = Date.now();
          reachedHWM = _this12.storeOptions.highWater != null && queueLength === _this12.storeOptions.highWater && !_this12.check(weight, now);
          blocked = _this12.strategyIsBlock() && (reachedHWM || _this12.isBlocked(now));
          if (blocked) {
            _this12._unblockTime = now + _this12.computePenalty();
            _this12._nextRequest = _this12._unblockTime + _this12.storeOptions.minTime;
            _this12.instance._dropAllQueued();
          }
          return {
            reachedHWM,
            blocked,
            strategy: _this12.storeOptions.strategy
          };
        })();
      }
      __free__(index2, weight) {
        var _this13 = this;
        return _asyncToGenerator2(function* () {
          yield _this13.yieldLoop();
          _this13._running -= weight;
          _this13._done += weight;
          _this13.instance._drainAll(_this13.computeCapacity());
          return {
            running: _this13._running
          };
        })();
      }
    };
    module2.exports = LocalDatastore;
  }
});

// node_modules/bottleneck/lib/lua.json
var require_lua = __commonJS({
  "node_modules/bottleneck/lib/lua.json"(exports2, module2) {
    module2.exports = {
      "blacklist_client.lua": "local blacklist = ARGV[num_static_argv + 1]\n\nif redis.call('zscore', client_last_seen_key, blacklist) then\n  redis.call('zadd', client_last_seen_key, 0, blacklist)\nend\n\n\nreturn {}\n",
      "check.lua": "local weight = tonumber(ARGV[num_static_argv + 1])\n\nlocal capacity = process_tick(now, false)['capacity']\nlocal nextRequest = tonumber(redis.call('hget', settings_key, 'nextRequest'))\n\nreturn conditions_check(capacity, weight) and nextRequest - now <= 0\n",
      "conditions_check.lua": "local conditions_check = function (capacity, weight)\n  return capacity == nil or weight <= capacity\nend\n",
      "current_reservoir.lua": "return process_tick(now, false)['reservoir']\n",
      "done.lua": "process_tick(now, false)\n\nreturn tonumber(redis.call('hget', settings_key, 'done'))\n",
      "free.lua": "local index = ARGV[num_static_argv + 1]\n\nredis.call('zadd', job_expirations_key, 0, index)\n\nreturn process_tick(now, false)['running']\n",
      "get_time.lua": "redis.replicate_commands()\n\nlocal get_time = function ()\n  local time = redis.call('time')\n\n  return tonumber(time[1]..string.sub(time[2], 1, 3))\nend\n",
      "group_check.lua": "return not (redis.call('exists', settings_key) == 1)\n",
      "heartbeat.lua": "process_tick(now, true)\n",
      "increment_reservoir.lua": "local incr = tonumber(ARGV[num_static_argv + 1])\n\nredis.call('hincrby', settings_key, 'reservoir', incr)\n\nlocal reservoir = process_tick(now, true)['reservoir']\n\nlocal groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))\nrefresh_expiration(0, 0, groupTimeout)\n\nreturn reservoir\n",
      "init.lua": `local clear = tonumber(ARGV[num_static_argv + 1])
local limiter_version = ARGV[num_static_argv + 2]
local num_local_argv = num_static_argv + 2

if clear == 1 then
  redis.call('del', unpack(KEYS))
end

if redis.call('exists', settings_key) == 0 then
  -- Create
  local args = {'hmset', settings_key}

  for i = num_local_argv + 1, #ARGV do
    table.insert(args, ARGV[i])
  end

  redis.call(unpack(args))
  redis.call('hmset', settings_key,
    'nextRequest', now,
    'lastReservoirRefresh', now,
    'lastReservoirIncrease', now,
    'running', 0,
    'done', 0,
    'unblockTime', 0,
    'capacityPriorityCounter', 0
  )

else
  -- Apply migrations
  local settings = redis.call('hmget', settings_key,
    'id',
    'version'
  )
  local id = settings[1]
  local current_version = settings[2]

  if current_version ~= limiter_version then
    local version_digits = {}
    for k, v in string.gmatch(current_version, "([^.]+)") do
      table.insert(version_digits, tonumber(k))
    end

    -- 2.10.0
    if version_digits[2] < 10 then
      redis.call('hsetnx', settings_key, 'reservoirRefreshInterval', '')
      redis.call('hsetnx', settings_key, 'reservoirRefreshAmount', '')
      redis.call('hsetnx', settings_key, 'lastReservoirRefresh', '')
      redis.call('hsetnx', settings_key, 'done', 0)
      redis.call('hset', settings_key, 'version', '2.10.0')
    end

    -- 2.11.1
    if version_digits[2] < 11 or (version_digits[2] == 11 and version_digits[3] < 1) then
      if redis.call('hstrlen', settings_key, 'lastReservoirRefresh') == 0 then
        redis.call('hmset', settings_key,
          'lastReservoirRefresh', now,
          'version', '2.11.1'
        )
      end
    end

    -- 2.14.0
    if version_digits[2] < 14 then
      local old_running_key = 'b_'..id..'_running'
      local old_executing_key = 'b_'..id..'_executing'

      if redis.call('exists', old_running_key) == 1 then
        redis.call('rename', old_running_key, job_weights_key)
      end
      if redis.call('exists', old_executing_key) == 1 then
        redis.call('rename', old_executing_key, job_expirations_key)
      end
      redis.call('hset', settings_key, 'version', '2.14.0')
    end

    -- 2.15.2
    if version_digits[2] < 15 or (version_digits[2] == 15 and version_digits[3] < 2) then
      redis.call('hsetnx', settings_key, 'capacityPriorityCounter', 0)
      redis.call('hset', settings_key, 'version', '2.15.2')
    end

    -- 2.17.0
    if version_digits[2] < 17 then
      redis.call('hsetnx', settings_key, 'clientTimeout', 10000)
      redis.call('hset', settings_key, 'version', '2.17.0')
    end

    -- 2.18.0
    if version_digits[2] < 18 then
      redis.call('hsetnx', settings_key, 'reservoirIncreaseInterval', '')
      redis.call('hsetnx', settings_key, 'reservoirIncreaseAmount', '')
      redis.call('hsetnx', settings_key, 'reservoirIncreaseMaximum', '')
      redis.call('hsetnx', settings_key, 'lastReservoirIncrease', now)
      redis.call('hset', settings_key, 'version', '2.18.0')
    end

  end

  process_tick(now, false)
end

local groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))
refresh_expiration(0, 0, groupTimeout)

return {}
`,
      "process_tick.lua": "local process_tick = function (now, always_publish)\n\n  local compute_capacity = function (maxConcurrent, running, reservoir)\n    if maxConcurrent ~= nil and reservoir ~= nil then\n      return math.min((maxConcurrent - running), reservoir)\n    elseif maxConcurrent ~= nil then\n      return maxConcurrent - running\n    elseif reservoir ~= nil then\n      return reservoir\n    else\n      return nil\n    end\n  end\n\n  local settings = redis.call('hmget', settings_key,\n    'id',\n    'maxConcurrent',\n    'running',\n    'reservoir',\n    'reservoirRefreshInterval',\n    'reservoirRefreshAmount',\n    'lastReservoirRefresh',\n    'reservoirIncreaseInterval',\n    'reservoirIncreaseAmount',\n    'reservoirIncreaseMaximum',\n    'lastReservoirIncrease',\n    'capacityPriorityCounter',\n    'clientTimeout'\n  )\n  local id = settings[1]\n  local maxConcurrent = tonumber(settings[2])\n  local running = tonumber(settings[3])\n  local reservoir = tonumber(settings[4])\n  local reservoirRefreshInterval = tonumber(settings[5])\n  local reservoirRefreshAmount = tonumber(settings[6])\n  local lastReservoirRefresh = tonumber(settings[7])\n  local reservoirIncreaseInterval = tonumber(settings[8])\n  local reservoirIncreaseAmount = tonumber(settings[9])\n  local reservoirIncreaseMaximum = tonumber(settings[10])\n  local lastReservoirIncrease = tonumber(settings[11])\n  local capacityPriorityCounter = tonumber(settings[12])\n  local clientTimeout = tonumber(settings[13])\n\n  local initial_capacity = compute_capacity(maxConcurrent, running, reservoir)\n\n  --\n  -- Process 'running' changes\n  --\n  local expired = redis.call('zrangebyscore', job_expirations_key, '-inf', '('..now)\n\n  if #expired > 0 then\n    redis.call('zremrangebyscore', job_expirations_key, '-inf', '('..now)\n\n    local flush_batch = function (batch, acc)\n      local weights = redis.call('hmget', job_weights_key, unpack(batch))\n                      redis.call('hdel',  job_weights_key, unpack(batch))\n      local clients = redis.call('hmget', job_clients_key, unpack(batch))\n                      redis.call('hdel',  job_clients_key, unpack(batch))\n\n      -- Calculate sum of removed weights\n      for i = 1, #weights do\n        acc['total'] = acc['total'] + (tonumber(weights[i]) or 0)\n      end\n\n      -- Calculate sum of removed weights by client\n      local client_weights = {}\n      for i = 1, #clients do\n        local removed = tonumber(weights[i]) or 0\n        if removed > 0 then\n          acc['client_weights'][clients[i]] = (acc['client_weights'][clients[i]] or 0) + removed\n        end\n      end\n    end\n\n    local acc = {\n      ['total'] = 0,\n      ['client_weights'] = {}\n    }\n    local batch_size = 1000\n\n    -- Compute changes to Zsets and apply changes to Hashes\n    for i = 1, #expired, batch_size do\n      local batch = {}\n      for j = i, math.min(i + batch_size - 1, #expired) do\n        table.insert(batch, expired[j])\n      end\n\n      flush_batch(batch, acc)\n    end\n\n    -- Apply changes to Zsets\n    if acc['total'] > 0 then\n      redis.call('hincrby', settings_key, 'done', acc['total'])\n      running = tonumber(redis.call('hincrby', settings_key, 'running', -acc['total']))\n    end\n\n    for client, weight in pairs(acc['client_weights']) do\n      redis.call('zincrby', client_running_key, -weight, client)\n    end\n  end\n\n  --\n  -- Process 'reservoir' changes\n  --\n  local reservoirRefreshActive = reservoirRefreshInterval ~= nil and reservoirRefreshAmount ~= nil\n  if reservoirRefreshActive and now >= lastReservoirRefresh + reservoirRefreshInterval then\n    reservoir = reservoirRefreshAmount\n    redis.call('hmset', settings_key,\n      'reservoir', reservoir,\n      'lastReservoirRefresh', now\n    )\n  end\n\n  local reservoirIncreaseActive = reservoirIncreaseInterval ~= nil and reservoirIncreaseAmount ~= nil\n  if reservoirIncreaseActive and now >= lastReservoirIncrease + reservoirIncreaseInterval then\n    local num_intervals = math.floor((now - lastReservoirIncrease) / reservoirIncreaseInterval)\n    local incr = reservoirIncreaseAmount * num_intervals\n    if reservoirIncreaseMaximum ~= nil then\n      incr = math.min(incr, reservoirIncreaseMaximum - (reservoir or 0))\n    end\n    if incr > 0 then\n      reservoir = (reservoir or 0) + incr\n    end\n    redis.call('hmset', settings_key,\n      'reservoir', reservoir,\n      'lastReservoirIncrease', lastReservoirIncrease + (num_intervals * reservoirIncreaseInterval)\n    )\n  end\n\n  --\n  -- Clear unresponsive clients\n  --\n  local unresponsive = redis.call('zrangebyscore', client_last_seen_key, '-inf', (now - clientTimeout))\n  local unresponsive_lookup = {}\n  local terminated_clients = {}\n  for i = 1, #unresponsive do\n    unresponsive_lookup[unresponsive[i]] = true\n    if tonumber(redis.call('zscore', client_running_key, unresponsive[i])) == 0 then\n      table.insert(terminated_clients, unresponsive[i])\n    end\n  end\n  if #terminated_clients > 0 then\n    redis.call('zrem', client_running_key,         unpack(terminated_clients))\n    redis.call('hdel', client_num_queued_key,      unpack(terminated_clients))\n    redis.call('zrem', client_last_registered_key, unpack(terminated_clients))\n    redis.call('zrem', client_last_seen_key,       unpack(terminated_clients))\n  end\n\n  --\n  -- Broadcast capacity changes\n  --\n  local final_capacity = compute_capacity(maxConcurrent, running, reservoir)\n\n  if always_publish or (initial_capacity ~= nil and final_capacity == nil) then\n    -- always_publish or was not unlimited, now unlimited\n    redis.call('publish', 'b_'..id, 'capacity:'..(final_capacity or ''))\n\n  elseif initial_capacity ~= nil and final_capacity ~= nil and final_capacity > initial_capacity then\n    -- capacity was increased\n    -- send the capacity message to the limiter having the lowest number of running jobs\n    -- the tiebreaker is the limiter having not registered a job in the longest time\n\n    local lowest_concurrency_value = nil\n    local lowest_concurrency_clients = {}\n    local lowest_concurrency_last_registered = {}\n    local client_concurrencies = redis.call('zrange', client_running_key, 0, -1, 'withscores')\n\n    for i = 1, #client_concurrencies, 2 do\n      local client = client_concurrencies[i]\n      local concurrency = tonumber(client_concurrencies[i+1])\n\n      if (\n        lowest_concurrency_value == nil or lowest_concurrency_value == concurrency\n      ) and (\n        not unresponsive_lookup[client]\n      ) and (\n        tonumber(redis.call('hget', client_num_queued_key, client)) > 0\n      ) then\n        lowest_concurrency_value = concurrency\n        table.insert(lowest_concurrency_clients, client)\n        local last_registered = tonumber(redis.call('zscore', client_last_registered_key, client))\n        table.insert(lowest_concurrency_last_registered, last_registered)\n      end\n    end\n\n    if #lowest_concurrency_clients > 0 then\n      local position = 1\n      local earliest = lowest_concurrency_last_registered[1]\n\n      for i,v in ipairs(lowest_concurrency_last_registered) do\n        if v < earliest then\n          position = i\n          earliest = v\n        end\n      end\n\n      local next_client = lowest_concurrency_clients[position]\n      redis.call('publish', 'b_'..id,\n        'capacity-priority:'..(final_capacity or '')..\n        ':'..next_client..\n        ':'..capacityPriorityCounter\n      )\n      redis.call('hincrby', settings_key, 'capacityPriorityCounter', '1')\n    else\n      redis.call('publish', 'b_'..id, 'capacity:'..(final_capacity or ''))\n    end\n  end\n\n  return {\n    ['capacity'] = final_capacity,\n    ['running'] = running,\n    ['reservoir'] = reservoir\n  }\nend\n",
      "queued.lua": "local clientTimeout = tonumber(redis.call('hget', settings_key, 'clientTimeout'))\nlocal valid_clients = redis.call('zrangebyscore', client_last_seen_key, (now - clientTimeout), 'inf')\nlocal client_queued = redis.call('hmget', client_num_queued_key, unpack(valid_clients))\n\nlocal sum = 0\nfor i = 1, #client_queued do\n  sum = sum + tonumber(client_queued[i])\nend\n\nreturn sum\n",
      "refresh_expiration.lua": "local refresh_expiration = function (now, nextRequest, groupTimeout)\n\n  if groupTimeout ~= nil then\n    local ttl = (nextRequest + groupTimeout) - now\n\n    for i = 1, #KEYS do\n      redis.call('pexpire', KEYS[i], ttl)\n    end\n  end\n\nend\n",
      "refs.lua": "local settings_key = KEYS[1]\nlocal job_weights_key = KEYS[2]\nlocal job_expirations_key = KEYS[3]\nlocal job_clients_key = KEYS[4]\nlocal client_running_key = KEYS[5]\nlocal client_num_queued_key = KEYS[6]\nlocal client_last_registered_key = KEYS[7]\nlocal client_last_seen_key = KEYS[8]\n\nlocal now = tonumber(ARGV[1])\nlocal client = ARGV[2]\n\nlocal num_static_argv = 2\n",
      "register.lua": "local index = ARGV[num_static_argv + 1]\nlocal weight = tonumber(ARGV[num_static_argv + 2])\nlocal expiration = tonumber(ARGV[num_static_argv + 3])\n\nlocal state = process_tick(now, false)\nlocal capacity = state['capacity']\nlocal reservoir = state['reservoir']\n\nlocal settings = redis.call('hmget', settings_key,\n  'nextRequest',\n  'minTime',\n  'groupTimeout'\n)\nlocal nextRequest = tonumber(settings[1])\nlocal minTime = tonumber(settings[2])\nlocal groupTimeout = tonumber(settings[3])\n\nif conditions_check(capacity, weight) then\n\n  redis.call('hincrby', settings_key, 'running', weight)\n  redis.call('hset', job_weights_key, index, weight)\n  if expiration ~= nil then\n    redis.call('zadd', job_expirations_key, now + expiration, index)\n  end\n  redis.call('hset', job_clients_key, index, client)\n  redis.call('zincrby', client_running_key, weight, client)\n  redis.call('hincrby', client_num_queued_key, client, -1)\n  redis.call('zadd', client_last_registered_key, now, client)\n\n  local wait = math.max(nextRequest - now, 0)\n  local newNextRequest = now + wait + minTime\n\n  if reservoir == nil then\n    redis.call('hset', settings_key,\n      'nextRequest', newNextRequest\n    )\n  else\n    reservoir = reservoir - weight\n    redis.call('hmset', settings_key,\n      'reservoir', reservoir,\n      'nextRequest', newNextRequest\n    )\n  end\n\n  refresh_expiration(now, newNextRequest, groupTimeout)\n\n  return {true, wait, reservoir}\n\nelse\n  return {false}\nend\n",
      "register_client.lua": "local queued = tonumber(ARGV[num_static_argv + 1])\n\n-- Could have been re-registered concurrently\nif not redis.call('zscore', client_last_seen_key, client) then\n  redis.call('zadd', client_running_key, 0, client)\n  redis.call('hset', client_num_queued_key, client, queued)\n  redis.call('zadd', client_last_registered_key, 0, client)\nend\n\nredis.call('zadd', client_last_seen_key, now, client)\n\nreturn {}\n",
      "running.lua": "return process_tick(now, false)['running']\n",
      "submit.lua": "local queueLength = tonumber(ARGV[num_static_argv + 1])\nlocal weight = tonumber(ARGV[num_static_argv + 2])\n\nlocal capacity = process_tick(now, false)['capacity']\n\nlocal settings = redis.call('hmget', settings_key,\n  'id',\n  'maxConcurrent',\n  'highWater',\n  'nextRequest',\n  'strategy',\n  'unblockTime',\n  'penalty',\n  'minTime',\n  'groupTimeout'\n)\nlocal id = settings[1]\nlocal maxConcurrent = tonumber(settings[2])\nlocal highWater = tonumber(settings[3])\nlocal nextRequest = tonumber(settings[4])\nlocal strategy = tonumber(settings[5])\nlocal unblockTime = tonumber(settings[6])\nlocal penalty = tonumber(settings[7])\nlocal minTime = tonumber(settings[8])\nlocal groupTimeout = tonumber(settings[9])\n\nif maxConcurrent ~= nil and weight > maxConcurrent then\n  return redis.error_reply('OVERWEIGHT:'..weight..':'..maxConcurrent)\nend\n\nlocal reachedHWM = (highWater ~= nil and queueLength == highWater\n  and not (\n    conditions_check(capacity, weight)\n    and nextRequest - now <= 0\n  )\n)\n\nlocal blocked = strategy == 3 and (reachedHWM or unblockTime >= now)\n\nif blocked then\n  local computedPenalty = penalty\n  if computedPenalty == nil then\n    if minTime == 0 then\n      computedPenalty = 5000\n    else\n      computedPenalty = 15 * minTime\n    end\n  end\n\n  local newNextRequest = now + computedPenalty + minTime\n\n  redis.call('hmset', settings_key,\n    'unblockTime', now + computedPenalty,\n    'nextRequest', newNextRequest\n  )\n\n  local clients_queued_reset = redis.call('hkeys', client_num_queued_key)\n  local queued_reset = {}\n  for i = 1, #clients_queued_reset do\n    table.insert(queued_reset, clients_queued_reset[i])\n    table.insert(queued_reset, 0)\n  end\n  redis.call('hmset', client_num_queued_key, unpack(queued_reset))\n\n  redis.call('publish', 'b_'..id, 'blocked:')\n\n  refresh_expiration(now, newNextRequest, groupTimeout)\nend\n\nif not blocked and not reachedHWM then\n  redis.call('hincrby', client_num_queued_key, client, 1)\nend\n\nreturn {reachedHWM, blocked, strategy}\n",
      "update_settings.lua": "local args = {'hmset', settings_key}\n\nfor i = num_static_argv + 1, #ARGV do\n  table.insert(args, ARGV[i])\nend\n\nredis.call(unpack(args))\n\nprocess_tick(now, true)\n\nlocal groupTimeout = tonumber(redis.call('hget', settings_key, 'groupTimeout'))\nrefresh_expiration(0, 0, groupTimeout)\n\nreturn {}\n",
      "validate_client.lua": "if not redis.call('zscore', client_last_seen_key, client) then\n  return redis.error_reply('UNKNOWN_CLIENT')\nend\n\nredis.call('zadd', client_last_seen_key, now, client)\n",
      "validate_keys.lua": "if not (redis.call('exists', settings_key) == 1) then\n  return redis.error_reply('SETTINGS_KEY_NOT_FOUND')\nend\n"
    };
  }
});

// node_modules/bottleneck/lib/Scripts.js
var require_Scripts = __commonJS({
  "node_modules/bottleneck/lib/Scripts.js"(exports2) {
    init_shims();
    "use strict";
    var headers;
    var lua;
    var templates;
    lua = require_lua();
    headers = {
      refs: lua["refs.lua"],
      validate_keys: lua["validate_keys.lua"],
      validate_client: lua["validate_client.lua"],
      refresh_expiration: lua["refresh_expiration.lua"],
      process_tick: lua["process_tick.lua"],
      conditions_check: lua["conditions_check.lua"],
      get_time: lua["get_time.lua"]
    };
    exports2.allKeys = function(id) {
      return [
        `b_${id}_settings`,
        `b_${id}_job_weights`,
        `b_${id}_job_expirations`,
        `b_${id}_job_clients`,
        `b_${id}_client_running`,
        `b_${id}_client_num_queued`,
        `b_${id}_client_last_registered`,
        `b_${id}_client_last_seen`
      ];
    };
    templates = {
      init: {
        keys: exports2.allKeys,
        headers: ["process_tick"],
        refresh_expiration: true,
        code: lua["init.lua"]
      },
      group_check: {
        keys: exports2.allKeys,
        headers: [],
        refresh_expiration: false,
        code: lua["group_check.lua"]
      },
      register_client: {
        keys: exports2.allKeys,
        headers: ["validate_keys"],
        refresh_expiration: false,
        code: lua["register_client.lua"]
      },
      blacklist_client: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client"],
        refresh_expiration: false,
        code: lua["blacklist_client.lua"]
      },
      heartbeat: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick"],
        refresh_expiration: false,
        code: lua["heartbeat.lua"]
      },
      update_settings: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick"],
        refresh_expiration: true,
        code: lua["update_settings.lua"]
      },
      running: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick"],
        refresh_expiration: false,
        code: lua["running.lua"]
      },
      queued: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client"],
        refresh_expiration: false,
        code: lua["queued.lua"]
      },
      done: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick"],
        refresh_expiration: false,
        code: lua["done.lua"]
      },
      check: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick", "conditions_check"],
        refresh_expiration: false,
        code: lua["check.lua"]
      },
      submit: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick", "conditions_check"],
        refresh_expiration: true,
        code: lua["submit.lua"]
      },
      register: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick", "conditions_check"],
        refresh_expiration: true,
        code: lua["register.lua"]
      },
      free: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick"],
        refresh_expiration: true,
        code: lua["free.lua"]
      },
      current_reservoir: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick"],
        refresh_expiration: false,
        code: lua["current_reservoir.lua"]
      },
      increment_reservoir: {
        keys: exports2.allKeys,
        headers: ["validate_keys", "validate_client", "process_tick"],
        refresh_expiration: true,
        code: lua["increment_reservoir.lua"]
      }
    };
    exports2.names = Object.keys(templates);
    exports2.keys = function(name, id) {
      return templates[name].keys(id);
    };
    exports2.payload = function(name) {
      var template2;
      template2 = templates[name];
      return Array.prototype.concat(headers.refs, template2.headers.map(function(h) {
        return headers[h];
      }), template2.refresh_expiration ? headers.refresh_expiration : "", template2.code).join("\n");
    };
  }
});

// node_modules/bottleneck/lib/RedisConnection.js
var require_RedisConnection = __commonJS({
  "node_modules/bottleneck/lib/RedisConnection.js"(exports, module) {
    init_shims();
    "use strict";
    function asyncGeneratorStep(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var Events;
    var RedisConnection;
    var Scripts;
    var parser;
    parser = require_parser();
    Events = require_Events();
    Scripts = require_Scripts();
    RedisConnection = function() {
      class RedisConnection {
        constructor(options = {}) {
          parser.load(options, this.defaults, this);
          if (this.Redis == null) {
            this.Redis = eval("require")("redis");
          }
          if (this.Events == null) {
            this.Events = new Events(this);
          }
          this.terminated = false;
          if (this.client == null) {
            this.client = this.Redis.createClient(this.clientOptions);
          }
          this.subscriber = this.client.duplicate();
          this.limiters = {};
          this.shas = {};
          this.ready = this.Promise.all([this._setup(this.client, false), this._setup(this.subscriber, true)]).then(() => {
            return this._loadScripts();
          }).then(() => {
            return {
              client: this.client,
              subscriber: this.subscriber
            };
          });
        }
        _setup(client, sub) {
          client.setMaxListeners(0);
          return new this.Promise((resolve2, reject) => {
            client.on("error", (e) => {
              return this.Events.trigger("error", e);
            });
            if (sub) {
              client.on("message", (channel, message) => {
                var ref;
                return (ref = this.limiters[channel]) != null ? ref._store.onMessage(channel, message) : void 0;
              });
            }
            if (client.ready) {
              return resolve2();
            } else {
              return client.once("ready", resolve2);
            }
          });
        }
        _loadScript(name) {
          return new this.Promise((resolve2, reject) => {
            var payload;
            payload = Scripts.payload(name);
            return this.client.multi([["script", "load", payload]]).exec((err, replies) => {
              if (err != null) {
                return reject(err);
              }
              this.shas[name] = replies[0];
              return resolve2(replies[0]);
            });
          });
        }
        _loadScripts() {
          return this.Promise.all(Scripts.names.map((k) => {
            return this._loadScript(k);
          }));
        }
        __runCommand__(cmd) {
          var _this = this;
          return _asyncToGenerator(function* () {
            yield _this.ready;
            return new _this.Promise((resolve2, reject) => {
              return _this.client.multi([cmd]).exec_atomic(function(err, replies) {
                if (err != null) {
                  return reject(err);
                } else {
                  return resolve2(replies[0]);
                }
              });
            });
          })();
        }
        __addLimiter__(instance) {
          return this.Promise.all([instance.channel(), instance.channel_client()].map((channel) => {
            return new this.Promise((resolve2, reject) => {
              var handler2;
              handler2 = (chan) => {
                if (chan === channel) {
                  this.subscriber.removeListener("subscribe", handler2);
                  this.limiters[channel] = instance;
                  return resolve2();
                }
              };
              this.subscriber.on("subscribe", handler2);
              return this.subscriber.subscribe(channel);
            });
          }));
        }
        __removeLimiter__(instance) {
          var _this2 = this;
          return this.Promise.all([instance.channel(), instance.channel_client()].map(/* @__PURE__ */ function() {
            var _ref = _asyncToGenerator(function* (channel) {
              if (!_this2.terminated) {
                yield new _this2.Promise((resolve2, reject) => {
                  return _this2.subscriber.unsubscribe(channel, function(err, chan) {
                    if (err != null) {
                      return reject(err);
                    }
                    if (chan === channel) {
                      return resolve2();
                    }
                  });
                });
              }
              return delete _this2.limiters[channel];
            });
            return function(_x) {
              return _ref.apply(this, arguments);
            };
          }()));
        }
        __scriptArgs__(name, id, args, cb) {
          var keys;
          keys = Scripts.keys(name, id);
          return [this.shas[name], keys.length].concat(keys, args, cb);
        }
        __scriptFn__(name) {
          return this.client.evalsha.bind(this.client);
        }
        disconnect(flush = true) {
          var i, k, len, ref;
          ref = Object.keys(this.limiters);
          for (i = 0, len = ref.length; i < len; i++) {
            k = ref[i];
            clearInterval(this.limiters[k]._store.heartbeat);
          }
          this.limiters = {};
          this.terminated = true;
          this.client.end(flush);
          this.subscriber.end(flush);
          return this.Promise.resolve();
        }
      }
      ;
      RedisConnection.prototype.datastore = "redis";
      RedisConnection.prototype.defaults = {
        Redis: null,
        clientOptions: {},
        client: null,
        Promise,
        Events: null
      };
      return RedisConnection;
    }.call(void 0);
    module.exports = RedisConnection;
  }
});

// node_modules/bottleneck/lib/IORedisConnection.js
var require_IORedisConnection = __commonJS({
  "node_modules/bottleneck/lib/IORedisConnection.js"(exports, module) {
    init_shims();
    "use strict";
    function _slicedToArray(arr, i) {
      return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
    }
    function _nonIterableRest() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
    function _iterableToArrayLimit(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = void 0;
      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);
          if (i && _arr.length === i)
            break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null)
            _i["return"]();
        } finally {
          if (_d)
            throw _e;
        }
      }
      return _arr;
    }
    function _arrayWithHoles(arr) {
      if (Array.isArray(arr))
        return arr;
    }
    function asyncGeneratorStep(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var Events;
    var IORedisConnection;
    var Scripts;
    var parser;
    parser = require_parser();
    Events = require_Events();
    Scripts = require_Scripts();
    IORedisConnection = function() {
      class IORedisConnection {
        constructor(options = {}) {
          parser.load(options, this.defaults, this);
          if (this.Redis == null) {
            this.Redis = eval("require")("ioredis");
          }
          if (this.Events == null) {
            this.Events = new Events(this);
          }
          this.terminated = false;
          if (this.clusterNodes != null) {
            this.client = new this.Redis.Cluster(this.clusterNodes, this.clientOptions);
            this.subscriber = new this.Redis.Cluster(this.clusterNodes, this.clientOptions);
          } else if (this.client != null && this.client.duplicate == null) {
            this.subscriber = new this.Redis.Cluster(this.client.startupNodes, this.client.options);
          } else {
            if (this.client == null) {
              this.client = new this.Redis(this.clientOptions);
            }
            this.subscriber = this.client.duplicate();
          }
          this.limiters = {};
          this.ready = this.Promise.all([this._setup(this.client, false), this._setup(this.subscriber, true)]).then(() => {
            this._loadScripts();
            return {
              client: this.client,
              subscriber: this.subscriber
            };
          });
        }
        _setup(client, sub) {
          client.setMaxListeners(0);
          return new this.Promise((resolve2, reject) => {
            client.on("error", (e) => {
              return this.Events.trigger("error", e);
            });
            if (sub) {
              client.on("message", (channel, message) => {
                var ref;
                return (ref = this.limiters[channel]) != null ? ref._store.onMessage(channel, message) : void 0;
              });
            }
            if (client.status === "ready") {
              return resolve2();
            } else {
              return client.once("ready", resolve2);
            }
          });
        }
        _loadScripts() {
          return Scripts.names.forEach((name) => {
            return this.client.defineCommand(name, {
              lua: Scripts.payload(name)
            });
          });
        }
        __runCommand__(cmd) {
          var _this = this;
          return _asyncToGenerator(function* () {
            var _, deleted;
            yield _this.ready;
            var _ref = yield _this.client.pipeline([cmd]).exec();
            var _ref2 = _slicedToArray(_ref, 1);
            var _ref2$ = _slicedToArray(_ref2[0], 2);
            _ = _ref2$[0];
            deleted = _ref2$[1];
            return deleted;
          })();
        }
        __addLimiter__(instance) {
          return this.Promise.all([instance.channel(), instance.channel_client()].map((channel) => {
            return new this.Promise((resolve2, reject) => {
              return this.subscriber.subscribe(channel, () => {
                this.limiters[channel] = instance;
                return resolve2();
              });
            });
          }));
        }
        __removeLimiter__(instance) {
          var _this2 = this;
          return [instance.channel(), instance.channel_client()].forEach(/* @__PURE__ */ function() {
            var _ref3 = _asyncToGenerator(function* (channel) {
              if (!_this2.terminated) {
                yield _this2.subscriber.unsubscribe(channel);
              }
              return delete _this2.limiters[channel];
            });
            return function(_x) {
              return _ref3.apply(this, arguments);
            };
          }());
        }
        __scriptArgs__(name, id, args, cb) {
          var keys;
          keys = Scripts.keys(name, id);
          return [keys.length].concat(keys, args, cb);
        }
        __scriptFn__(name) {
          return this.client[name].bind(this.client);
        }
        disconnect(flush = true) {
          var i, k, len, ref;
          ref = Object.keys(this.limiters);
          for (i = 0, len = ref.length; i < len; i++) {
            k = ref[i];
            clearInterval(this.limiters[k]._store.heartbeat);
          }
          this.limiters = {};
          this.terminated = true;
          if (flush) {
            return this.Promise.all([this.client.quit(), this.subscriber.quit()]);
          } else {
            this.client.disconnect();
            this.subscriber.disconnect();
            return this.Promise.resolve();
          }
        }
      }
      ;
      IORedisConnection.prototype.datastore = "ioredis";
      IORedisConnection.prototype.defaults = {
        Redis: null,
        clientOptions: {},
        clusterNodes: null,
        client: null,
        Promise,
        Events: null
      };
      return IORedisConnection;
    }.call(void 0);
    module.exports = IORedisConnection;
  }
});

// node_modules/bottleneck/lib/RedisDatastore.js
var require_RedisDatastore = __commonJS({
  "node_modules/bottleneck/lib/RedisDatastore.js"(exports2, module2) {
    init_shims();
    "use strict";
    function _slicedToArray2(arr, i) {
      return _arrayWithHoles2(arr) || _iterableToArrayLimit2(arr, i) || _nonIterableRest2();
    }
    function _nonIterableRest2() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
    function _iterableToArrayLimit2(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = void 0;
      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);
          if (i && _arr.length === i)
            break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null)
            _i["return"]();
        } finally {
          if (_d)
            throw _e;
        }
      }
      return _arr;
    }
    function _arrayWithHoles2(arr) {
      if (Array.isArray(arr))
        return arr;
    }
    function asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator2(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var BottleneckError;
    var IORedisConnection2;
    var RedisConnection2;
    var RedisDatastore;
    var parser2;
    parser2 = require_parser();
    BottleneckError = require_BottleneckError();
    RedisConnection2 = require_RedisConnection();
    IORedisConnection2 = require_IORedisConnection();
    RedisDatastore = class RedisDatastore {
      constructor(instance, storeOptions, storeInstanceOptions) {
        this.instance = instance;
        this.storeOptions = storeOptions;
        this.originalId = this.instance.id;
        this.clientId = this.instance._randomIndex();
        parser2.load(storeInstanceOptions, storeInstanceOptions, this);
        this.clients = {};
        this.capacityPriorityCounters = {};
        this.sharedConnection = this.connection != null;
        if (this.connection == null) {
          this.connection = this.instance.datastore === "redis" ? new RedisConnection2({
            Redis: this.Redis,
            clientOptions: this.clientOptions,
            Promise: this.Promise,
            Events: this.instance.Events
          }) : this.instance.datastore === "ioredis" ? new IORedisConnection2({
            Redis: this.Redis,
            clientOptions: this.clientOptions,
            clusterNodes: this.clusterNodes,
            Promise: this.Promise,
            Events: this.instance.Events
          }) : void 0;
        }
        this.instance.connection = this.connection;
        this.instance.datastore = this.connection.datastore;
        this.ready = this.connection.ready.then((clients) => {
          this.clients = clients;
          return this.runScript("init", this.prepareInitSettings(this.clearDatastore));
        }).then(() => {
          return this.connection.__addLimiter__(this.instance);
        }).then(() => {
          return this.runScript("register_client", [this.instance.queued()]);
        }).then(() => {
          var base2;
          if (typeof (base2 = this.heartbeat = setInterval(() => {
            return this.runScript("heartbeat", []).catch((e) => {
              return this.instance.Events.trigger("error", e);
            });
          }, this.heartbeatInterval)).unref === "function") {
            base2.unref();
          }
          return this.clients;
        });
      }
      __publish__(message) {
        var _this = this;
        return _asyncToGenerator2(function* () {
          var client;
          var _ref = yield _this.ready;
          client = _ref.client;
          return client.publish(_this.instance.channel(), `message:${message.toString()}`);
        })();
      }
      onMessage(channel, message) {
        var _this2 = this;
        return _asyncToGenerator2(function* () {
          var capacity, counter, data, drained, e, newCapacity, pos, priorityClient, rawCapacity, type;
          try {
            pos = message.indexOf(":");
            var _ref2 = [message.slice(0, pos), message.slice(pos + 1)];
            type = _ref2[0];
            data = _ref2[1];
            if (type === "capacity") {
              return yield _this2.instance._drainAll(data.length > 0 ? ~~data : void 0);
            } else if (type === "capacity-priority") {
              var _data$split = data.split(":");
              var _data$split2 = _slicedToArray2(_data$split, 3);
              rawCapacity = _data$split2[0];
              priorityClient = _data$split2[1];
              counter = _data$split2[2];
              capacity = rawCapacity.length > 0 ? ~~rawCapacity : void 0;
              if (priorityClient === _this2.clientId) {
                drained = yield _this2.instance._drainAll(capacity);
                newCapacity = capacity != null ? capacity - (drained || 0) : "";
                return yield _this2.clients.client.publish(_this2.instance.channel(), `capacity-priority:${newCapacity}::${counter}`);
              } else if (priorityClient === "") {
                clearTimeout(_this2.capacityPriorityCounters[counter]);
                delete _this2.capacityPriorityCounters[counter];
                return _this2.instance._drainAll(capacity);
              } else {
                return _this2.capacityPriorityCounters[counter] = setTimeout(/* @__PURE__ */ _asyncToGenerator2(function* () {
                  var e2;
                  try {
                    delete _this2.capacityPriorityCounters[counter];
                    yield _this2.runScript("blacklist_client", [priorityClient]);
                    return yield _this2.instance._drainAll(capacity);
                  } catch (error2) {
                    e2 = error2;
                    return _this2.instance.Events.trigger("error", e2);
                  }
                }), 1e3);
              }
            } else if (type === "message") {
              return _this2.instance.Events.trigger("message", data);
            } else if (type === "blocked") {
              return yield _this2.instance._dropAllQueued();
            }
          } catch (error2) {
            e = error2;
            return _this2.instance.Events.trigger("error", e);
          }
        })();
      }
      __disconnect__(flush) {
        clearInterval(this.heartbeat);
        if (this.sharedConnection) {
          return this.connection.__removeLimiter__(this.instance);
        } else {
          return this.connection.disconnect(flush);
        }
      }
      runScript(name, args) {
        var _this3 = this;
        return _asyncToGenerator2(function* () {
          if (!(name === "init" || name === "register_client")) {
            yield _this3.ready;
          }
          return new _this3.Promise((resolve2, reject) => {
            var all_args, arr;
            all_args = [Date.now(), _this3.clientId].concat(args);
            _this3.instance.Events.trigger("debug", `Calling Redis script: ${name}.lua`, all_args);
            arr = _this3.connection.__scriptArgs__(name, _this3.originalId, all_args, function(err, replies) {
              if (err != null) {
                return reject(err);
              }
              return resolve2(replies);
            });
            return _this3.connection.__scriptFn__(name)(...arr);
          }).catch((e) => {
            if (e.message === "SETTINGS_KEY_NOT_FOUND") {
              if (name === "heartbeat") {
                return _this3.Promise.resolve();
              } else {
                return _this3.runScript("init", _this3.prepareInitSettings(false)).then(() => {
                  return _this3.runScript(name, args);
                });
              }
            } else if (e.message === "UNKNOWN_CLIENT") {
              return _this3.runScript("register_client", [_this3.instance.queued()]).then(() => {
                return _this3.runScript(name, args);
              });
            } else {
              return _this3.Promise.reject(e);
            }
          });
        })();
      }
      prepareArray(arr) {
        var i, len, results, x;
        results = [];
        for (i = 0, len = arr.length; i < len; i++) {
          x = arr[i];
          results.push(x != null ? x.toString() : "");
        }
        return results;
      }
      prepareObject(obj) {
        var arr, k, v;
        arr = [];
        for (k in obj) {
          v = obj[k];
          arr.push(k, v != null ? v.toString() : "");
        }
        return arr;
      }
      prepareInitSettings(clear) {
        var args;
        args = this.prepareObject(Object.assign({}, this.storeOptions, {
          id: this.originalId,
          version: this.instance.version,
          groupTimeout: this.timeout,
          clientTimeout: this.clientTimeout
        }));
        args.unshift(clear ? 1 : 0, this.instance.version);
        return args;
      }
      convertBool(b) {
        return !!b;
      }
      __updateSettings__(options3) {
        var _this4 = this;
        return _asyncToGenerator2(function* () {
          yield _this4.runScript("update_settings", _this4.prepareObject(options3));
          return parser2.overwrite(options3, options3, _this4.storeOptions);
        })();
      }
      __running__() {
        return this.runScript("running", []);
      }
      __queued__() {
        return this.runScript("queued", []);
      }
      __done__() {
        return this.runScript("done", []);
      }
      __groupCheck__() {
        var _this5 = this;
        return _asyncToGenerator2(function* () {
          return _this5.convertBool(yield _this5.runScript("group_check", []));
        })();
      }
      __incrementReservoir__(incr) {
        return this.runScript("increment_reservoir", [incr]);
      }
      __currentReservoir__() {
        return this.runScript("current_reservoir", []);
      }
      __check__(weight) {
        var _this6 = this;
        return _asyncToGenerator2(function* () {
          return _this6.convertBool(yield _this6.runScript("check", _this6.prepareArray([weight])));
        })();
      }
      __register__(index2, weight, expiration) {
        var _this7 = this;
        return _asyncToGenerator2(function* () {
          var reservoir, success, wait;
          var _ref4 = yield _this7.runScript("register", _this7.prepareArray([index2, weight, expiration]));
          var _ref5 = _slicedToArray2(_ref4, 3);
          success = _ref5[0];
          wait = _ref5[1];
          reservoir = _ref5[2];
          return {
            success: _this7.convertBool(success),
            wait,
            reservoir
          };
        })();
      }
      __submit__(queueLength, weight) {
        var _this8 = this;
        return _asyncToGenerator2(function* () {
          var blocked, e, maxConcurrent, overweight, reachedHWM, strategy;
          try {
            var _ref6 = yield _this8.runScript("submit", _this8.prepareArray([queueLength, weight]));
            var _ref7 = _slicedToArray2(_ref6, 3);
            reachedHWM = _ref7[0];
            blocked = _ref7[1];
            strategy = _ref7[2];
            return {
              reachedHWM: _this8.convertBool(reachedHWM),
              blocked: _this8.convertBool(blocked),
              strategy
            };
          } catch (error2) {
            e = error2;
            if (e.message.indexOf("OVERWEIGHT") === 0) {
              var _e$message$split = e.message.split(":");
              var _e$message$split2 = _slicedToArray2(_e$message$split, 3);
              overweight = _e$message$split2[0];
              weight = _e$message$split2[1];
              maxConcurrent = _e$message$split2[2];
              throw new BottleneckError(`Impossible to add a job having a weight of ${weight} to a limiter having a maxConcurrent setting of ${maxConcurrent}`);
            } else {
              throw e;
            }
          }
        })();
      }
      __free__(index2, weight) {
        var _this9 = this;
        return _asyncToGenerator2(function* () {
          var running;
          running = yield _this9.runScript("free", _this9.prepareArray([index2]));
          return {
            running
          };
        })();
      }
    };
    module2.exports = RedisDatastore;
  }
});

// node_modules/bottleneck/lib/States.js
var require_States = __commonJS({
  "node_modules/bottleneck/lib/States.js"(exports2, module2) {
    init_shims();
    "use strict";
    var BottleneckError;
    var States;
    BottleneckError = require_BottleneckError();
    States = class States {
      constructor(status1) {
        this.status = status1;
        this._jobs = {};
        this.counts = this.status.map(function() {
          return 0;
        });
      }
      next(id) {
        var current, next;
        current = this._jobs[id];
        next = current + 1;
        if (current != null && next < this.status.length) {
          this.counts[current]--;
          this.counts[next]++;
          return this._jobs[id]++;
        } else if (current != null) {
          this.counts[current]--;
          return delete this._jobs[id];
        }
      }
      start(id) {
        var initial;
        initial = 0;
        this._jobs[id] = initial;
        return this.counts[initial]++;
      }
      remove(id) {
        var current;
        current = this._jobs[id];
        if (current != null) {
          this.counts[current]--;
          delete this._jobs[id];
        }
        return current != null;
      }
      jobStatus(id) {
        var ref;
        return (ref = this.status[this._jobs[id]]) != null ? ref : null;
      }
      statusJobs(status) {
        var k, pos, ref, results, v;
        if (status != null) {
          pos = this.status.indexOf(status);
          if (pos < 0) {
            throw new BottleneckError(`status must be one of ${this.status.join(", ")}`);
          }
          ref = this._jobs;
          results = [];
          for (k in ref) {
            v = ref[k];
            if (v === pos) {
              results.push(k);
            }
          }
          return results;
        } else {
          return Object.keys(this._jobs);
        }
      }
      statusCounts() {
        return this.counts.reduce((acc, v, i) => {
          acc[this.status[i]] = v;
          return acc;
        }, {});
      }
    };
    module2.exports = States;
  }
});

// node_modules/bottleneck/lib/Sync.js
var require_Sync = __commonJS({
  "node_modules/bottleneck/lib/Sync.js"(exports2, module2) {
    init_shims();
    "use strict";
    function asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator2(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var DLList;
    var Sync;
    DLList = require_DLList();
    Sync = class Sync {
      constructor(name, Promise2) {
        this.schedule = this.schedule.bind(this);
        this.name = name;
        this.Promise = Promise2;
        this._running = 0;
        this._queue = new DLList();
      }
      isEmpty() {
        return this._queue.length === 0;
      }
      _tryToRun() {
        var _this = this;
        return _asyncToGenerator2(function* () {
          var args, cb, error2, reject, resolve2, returned, task;
          if (_this._running < 1 && _this._queue.length > 0) {
            _this._running++;
            var _this$_queue$shift = _this._queue.shift();
            task = _this$_queue$shift.task;
            args = _this$_queue$shift.args;
            resolve2 = _this$_queue$shift.resolve;
            reject = _this$_queue$shift.reject;
            cb = yield _asyncToGenerator2(function* () {
              try {
                returned = yield task(...args);
                return function() {
                  return resolve2(returned);
                };
              } catch (error1) {
                error2 = error1;
                return function() {
                  return reject(error2);
                };
              }
            })();
            _this._running--;
            _this._tryToRun();
            return cb();
          }
        })();
      }
      schedule(task, ...args) {
        var promise, reject, resolve2;
        resolve2 = reject = null;
        promise = new this.Promise(function(_resolve, _reject) {
          resolve2 = _resolve;
          return reject = _reject;
        });
        this._queue.push({
          task,
          args,
          resolve: resolve2,
          reject
        });
        this._tryToRun();
        return promise;
      }
    };
    module2.exports = Sync;
  }
});

// node_modules/bottleneck/lib/version.json
var require_version = __commonJS({
  "node_modules/bottleneck/lib/version.json"(exports2, module2) {
    module2.exports = { version: "2.19.5" };
  }
});

// node_modules/bottleneck/lib/Group.js
var require_Group = __commonJS({
  "node_modules/bottleneck/lib/Group.js"(exports2, module2) {
    init_shims();
    "use strict";
    function _slicedToArray2(arr, i) {
      return _arrayWithHoles2(arr) || _iterableToArrayLimit2(arr, i) || _nonIterableRest2();
    }
    function _nonIterableRest2() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
    function _iterableToArrayLimit2(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = void 0;
      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);
          if (i && _arr.length === i)
            break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null)
            _i["return"]();
        } finally {
          if (_d)
            throw _e;
        }
      }
      return _arr;
    }
    function _arrayWithHoles2(arr) {
      if (Array.isArray(arr))
        return arr;
    }
    function asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator2(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var Events2;
    var Group;
    var IORedisConnection2;
    var RedisConnection2;
    var Scripts2;
    var parser2;
    parser2 = require_parser();
    Events2 = require_Events();
    RedisConnection2 = require_RedisConnection();
    IORedisConnection2 = require_IORedisConnection();
    Scripts2 = require_Scripts();
    Group = function() {
      class Group2 {
        constructor(limiterOptions = {}) {
          this.deleteKey = this.deleteKey.bind(this);
          this.limiterOptions = limiterOptions;
          parser2.load(this.limiterOptions, this.defaults, this);
          this.Events = new Events2(this);
          this.instances = {};
          this.Bottleneck = require_Bottleneck();
          this._startAutoCleanup();
          this.sharedConnection = this.connection != null;
          if (this.connection == null) {
            if (this.limiterOptions.datastore === "redis") {
              this.connection = new RedisConnection2(Object.assign({}, this.limiterOptions, {
                Events: this.Events
              }));
            } else if (this.limiterOptions.datastore === "ioredis") {
              this.connection = new IORedisConnection2(Object.assign({}, this.limiterOptions, {
                Events: this.Events
              }));
            }
          }
        }
        key(key = "") {
          var ref;
          return (ref = this.instances[key]) != null ? ref : (() => {
            var limiter2;
            limiter2 = this.instances[key] = new this.Bottleneck(Object.assign(this.limiterOptions, {
              id: `${this.id}-${key}`,
              timeout: this.timeout,
              connection: this.connection
            }));
            this.Events.trigger("created", limiter2, key);
            return limiter2;
          })();
        }
        deleteKey(key = "") {
          var _this = this;
          return _asyncToGenerator2(function* () {
            var deleted, instance;
            instance = _this.instances[key];
            if (_this.connection) {
              deleted = yield _this.connection.__runCommand__(["del", ...Scripts2.allKeys(`${_this.id}-${key}`)]);
            }
            if (instance != null) {
              delete _this.instances[key];
              yield instance.disconnect();
            }
            return instance != null || deleted > 0;
          })();
        }
        limiters() {
          var k, ref, results, v;
          ref = this.instances;
          results = [];
          for (k in ref) {
            v = ref[k];
            results.push({
              key: k,
              limiter: v
            });
          }
          return results;
        }
        keys() {
          return Object.keys(this.instances);
        }
        clusterKeys() {
          var _this2 = this;
          return _asyncToGenerator2(function* () {
            var cursor, end, found, i, k, keys, len, next, start;
            if (_this2.connection == null) {
              return _this2.Promise.resolve(_this2.keys());
            }
            keys = [];
            cursor = null;
            start = `b_${_this2.id}-`.length;
            end = "_settings".length;
            while (cursor !== 0) {
              var _ref = yield _this2.connection.__runCommand__(["scan", cursor != null ? cursor : 0, "match", `b_${_this2.id}-*_settings`, "count", 1e4]);
              var _ref2 = _slicedToArray2(_ref, 2);
              next = _ref2[0];
              found = _ref2[1];
              cursor = ~~next;
              for (i = 0, len = found.length; i < len; i++) {
                k = found[i];
                keys.push(k.slice(start, -end));
              }
            }
            return keys;
          })();
        }
        _startAutoCleanup() {
          var _this3 = this;
          var base2;
          clearInterval(this.interval);
          return typeof (base2 = this.interval = setInterval(/* @__PURE__ */ _asyncToGenerator2(function* () {
            var e, k, ref, results, time, v;
            time = Date.now();
            ref = _this3.instances;
            results = [];
            for (k in ref) {
              v = ref[k];
              try {
                if (yield v._store.__groupCheck__(time)) {
                  results.push(_this3.deleteKey(k));
                } else {
                  results.push(void 0);
                }
              } catch (error2) {
                e = error2;
                results.push(v.Events.trigger("error", e));
              }
            }
            return results;
          }), this.timeout / 2)).unref === "function" ? base2.unref() : void 0;
        }
        updateSettings(options3 = {}) {
          parser2.overwrite(options3, this.defaults, this);
          parser2.overwrite(options3, options3, this.limiterOptions);
          if (options3.timeout != null) {
            return this._startAutoCleanup();
          }
        }
        disconnect(flush = true) {
          var ref;
          if (!this.sharedConnection) {
            return (ref = this.connection) != null ? ref.disconnect(flush) : void 0;
          }
        }
      }
      ;
      Group2.prototype.defaults = {
        timeout: 1e3 * 60 * 5,
        connection: null,
        Promise,
        id: "group-key"
      };
      return Group2;
    }.call(void 0);
    module2.exports = Group;
  }
});

// node_modules/bottleneck/lib/Batcher.js
var require_Batcher = __commonJS({
  "node_modules/bottleneck/lib/Batcher.js"(exports2, module2) {
    init_shims();
    "use strict";
    var Batcher;
    var Events2;
    var parser2;
    parser2 = require_parser();
    Events2 = require_Events();
    Batcher = function() {
      class Batcher2 {
        constructor(options3 = {}) {
          this.options = options3;
          parser2.load(this.options, this.defaults, this);
          this.Events = new Events2(this);
          this._arr = [];
          this._resetPromise();
          this._lastFlush = Date.now();
        }
        _resetPromise() {
          return this._promise = new this.Promise((res, rej) => {
            return this._resolve = res;
          });
        }
        _flush() {
          clearTimeout(this._timeout);
          this._lastFlush = Date.now();
          this._resolve();
          this.Events.trigger("batch", this._arr);
          this._arr = [];
          return this._resetPromise();
        }
        add(data) {
          var ret;
          this._arr.push(data);
          ret = this._promise;
          if (this._arr.length === this.maxSize) {
            this._flush();
          } else if (this.maxTime != null && this._arr.length === 1) {
            this._timeout = setTimeout(() => {
              return this._flush();
            }, this.maxTime);
          }
          return ret;
        }
      }
      ;
      Batcher2.prototype.defaults = {
        maxTime: null,
        maxSize: null,
        Promise
      };
      return Batcher2;
    }.call(void 0);
    module2.exports = Batcher;
  }
});

// node_modules/bottleneck/lib/Bottleneck.js
var require_Bottleneck = __commonJS({
  "node_modules/bottleneck/lib/Bottleneck.js"(exports2, module2) {
    init_shims();
    "use strict";
    function _slicedToArray2(arr, i) {
      return _arrayWithHoles2(arr) || _iterableToArrayLimit2(arr, i) || _nonIterableRest2();
    }
    function _iterableToArrayLimit2(arr, i) {
      var _arr = [];
      var _n = true;
      var _d = false;
      var _e = void 0;
      try {
        for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
          _arr.push(_s.value);
          if (i && _arr.length === i)
            break;
        }
      } catch (err) {
        _d = true;
        _e = err;
      } finally {
        try {
          if (!_n && _i["return"] != null)
            _i["return"]();
        } finally {
          if (_d)
            throw _e;
        }
      }
      return _arr;
    }
    function _toArray(arr) {
      return _arrayWithHoles2(arr) || _iterableToArray(arr) || _nonIterableRest2();
    }
    function _nonIterableRest2() {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
    function _iterableToArray(iter) {
      if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]")
        return Array.from(iter);
    }
    function _arrayWithHoles2(arr) {
      if (Array.isArray(arr))
        return arr;
    }
    function asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, key, arg) {
      try {
        var info = gen[key](arg);
        var value = info.value;
      } catch (error2) {
        reject(error2);
        return;
      }
      if (info.done) {
        resolve2(value);
      } else {
        Promise.resolve(value).then(_next, _throw);
      }
    }
    function _asyncToGenerator2(fn) {
      return function() {
        var self2 = this, args = arguments;
        return new Promise(function(resolve2, reject) {
          var gen = fn.apply(self2, args);
          function _next(value) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "next", value);
          }
          function _throw(err) {
            asyncGeneratorStep2(gen, resolve2, reject, _next, _throw, "throw", err);
          }
          _next(void 0);
        });
      };
    }
    var Bottleneck2;
    var DEFAULT_PRIORITY;
    var Events2;
    var Job;
    var LocalDatastore;
    var NUM_PRIORITIES;
    var Queues;
    var RedisDatastore;
    var States;
    var Sync;
    var parser2;
    var splice = [].splice;
    NUM_PRIORITIES = 10;
    DEFAULT_PRIORITY = 5;
    parser2 = require_parser();
    Queues = require_Queues();
    Job = require_Job();
    LocalDatastore = require_LocalDatastore();
    RedisDatastore = require_RedisDatastore();
    Events2 = require_Events();
    States = require_States();
    Sync = require_Sync();
    Bottleneck2 = function() {
      class Bottleneck3 {
        constructor(options3 = {}, ...invalid) {
          var storeInstanceOptions, storeOptions;
          this._addToQueue = this._addToQueue.bind(this);
          this._validateOptions(options3, invalid);
          parser2.load(options3, this.instanceDefaults, this);
          this._queues = new Queues(NUM_PRIORITIES);
          this._scheduled = {};
          this._states = new States(["RECEIVED", "QUEUED", "RUNNING", "EXECUTING"].concat(this.trackDoneStatus ? ["DONE"] : []));
          this._limiter = null;
          this.Events = new Events2(this);
          this._submitLock = new Sync("submit", this.Promise);
          this._registerLock = new Sync("register", this.Promise);
          storeOptions = parser2.load(options3, this.storeDefaults, {});
          this._store = function() {
            if (this.datastore === "redis" || this.datastore === "ioredis" || this.connection != null) {
              storeInstanceOptions = parser2.load(options3, this.redisStoreDefaults, {});
              return new RedisDatastore(this, storeOptions, storeInstanceOptions);
            } else if (this.datastore === "local") {
              storeInstanceOptions = parser2.load(options3, this.localStoreDefaults, {});
              return new LocalDatastore(this, storeOptions, storeInstanceOptions);
            } else {
              throw new Bottleneck3.prototype.BottleneckError(`Invalid datastore type: ${this.datastore}`);
            }
          }.call(this);
          this._queues.on("leftzero", () => {
            var ref;
            return (ref = this._store.heartbeat) != null ? typeof ref.ref === "function" ? ref.ref() : void 0 : void 0;
          });
          this._queues.on("zero", () => {
            var ref;
            return (ref = this._store.heartbeat) != null ? typeof ref.unref === "function" ? ref.unref() : void 0 : void 0;
          });
        }
        _validateOptions(options3, invalid) {
          if (!(options3 != null && typeof options3 === "object" && invalid.length === 0)) {
            throw new Bottleneck3.prototype.BottleneckError("Bottleneck v2 takes a single object argument. Refer to https://github.com/SGrondin/bottleneck#upgrading-to-v2 if you're upgrading from Bottleneck v1.");
          }
        }
        ready() {
          return this._store.ready;
        }
        clients() {
          return this._store.clients;
        }
        channel() {
          return `b_${this.id}`;
        }
        channel_client() {
          return `b_${this.id}_${this._store.clientId}`;
        }
        publish(message) {
          return this._store.__publish__(message);
        }
        disconnect(flush = true) {
          return this._store.__disconnect__(flush);
        }
        chain(_limiter) {
          this._limiter = _limiter;
          return this;
        }
        queued(priority) {
          return this._queues.queued(priority);
        }
        clusterQueued() {
          return this._store.__queued__();
        }
        empty() {
          return this.queued() === 0 && this._submitLock.isEmpty();
        }
        running() {
          return this._store.__running__();
        }
        done() {
          return this._store.__done__();
        }
        jobStatus(id) {
          return this._states.jobStatus(id);
        }
        jobs(status) {
          return this._states.statusJobs(status);
        }
        counts() {
          return this._states.statusCounts();
        }
        _randomIndex() {
          return Math.random().toString(36).slice(2);
        }
        check(weight = 1) {
          return this._store.__check__(weight);
        }
        _clearGlobalState(index2) {
          if (this._scheduled[index2] != null) {
            clearTimeout(this._scheduled[index2].expiration);
            delete this._scheduled[index2];
            return true;
          } else {
            return false;
          }
        }
        _free(index2, job, options3, eventInfo) {
          var _this = this;
          return _asyncToGenerator2(function* () {
            var e, running;
            try {
              var _ref = yield _this._store.__free__(index2, options3.weight);
              running = _ref.running;
              _this.Events.trigger("debug", `Freed ${options3.id}`, eventInfo);
              if (running === 0 && _this.empty()) {
                return _this.Events.trigger("idle");
              }
            } catch (error1) {
              e = error1;
              return _this.Events.trigger("error", e);
            }
          })();
        }
        _run(index2, job, wait) {
          var clearGlobalState, free, run2;
          job.doRun();
          clearGlobalState = this._clearGlobalState.bind(this, index2);
          run2 = this._run.bind(this, index2, job);
          free = this._free.bind(this, index2, job);
          return this._scheduled[index2] = {
            timeout: setTimeout(() => {
              return job.doExecute(this._limiter, clearGlobalState, run2, free);
            }, wait),
            expiration: job.options.expiration != null ? setTimeout(function() {
              return job.doExpire(clearGlobalState, run2, free);
            }, wait + job.options.expiration) : void 0,
            job
          };
        }
        _drainOne(capacity) {
          return this._registerLock.schedule(() => {
            var args, index2, next, options3, queue;
            if (this.queued() === 0) {
              return this.Promise.resolve(null);
            }
            queue = this._queues.getFirst();
            var _next2 = next = queue.first();
            options3 = _next2.options;
            args = _next2.args;
            if (capacity != null && options3.weight > capacity) {
              return this.Promise.resolve(null);
            }
            this.Events.trigger("debug", `Draining ${options3.id}`, {
              args,
              options: options3
            });
            index2 = this._randomIndex();
            return this._store.__register__(index2, options3.weight, options3.expiration).then(({
              success,
              wait,
              reservoir
            }) => {
              var empty2;
              this.Events.trigger("debug", `Drained ${options3.id}`, {
                success,
                args,
                options: options3
              });
              if (success) {
                queue.shift();
                empty2 = this.empty();
                if (empty2) {
                  this.Events.trigger("empty");
                }
                if (reservoir === 0) {
                  this.Events.trigger("depleted", empty2);
                }
                this._run(index2, next, wait);
                return this.Promise.resolve(options3.weight);
              } else {
                return this.Promise.resolve(null);
              }
            });
          });
        }
        _drainAll(capacity, total = 0) {
          return this._drainOne(capacity).then((drained) => {
            var newCapacity;
            if (drained != null) {
              newCapacity = capacity != null ? capacity - drained : capacity;
              return this._drainAll(newCapacity, total + drained);
            } else {
              return this.Promise.resolve(total);
            }
          }).catch((e) => {
            return this.Events.trigger("error", e);
          });
        }
        _dropAllQueued(message) {
          return this._queues.shiftAll(function(job) {
            return job.doDrop({
              message
            });
          });
        }
        stop(options3 = {}) {
          var done, waitForExecuting;
          options3 = parser2.load(options3, this.stopDefaults);
          waitForExecuting = (at) => {
            var finished;
            finished = () => {
              var counts;
              counts = this._states.counts;
              return counts[0] + counts[1] + counts[2] + counts[3] === at;
            };
            return new this.Promise((resolve2, reject) => {
              if (finished()) {
                return resolve2();
              } else {
                return this.on("done", () => {
                  if (finished()) {
                    this.removeAllListeners("done");
                    return resolve2();
                  }
                });
              }
            });
          };
          done = options3.dropWaitingJobs ? (this._run = function(index2, next) {
            return next.doDrop({
              message: options3.dropErrorMessage
            });
          }, this._drainOne = () => {
            return this.Promise.resolve(null);
          }, this._registerLock.schedule(() => {
            return this._submitLock.schedule(() => {
              var k, ref, v;
              ref = this._scheduled;
              for (k in ref) {
                v = ref[k];
                if (this.jobStatus(v.job.options.id) === "RUNNING") {
                  clearTimeout(v.timeout);
                  clearTimeout(v.expiration);
                  v.job.doDrop({
                    message: options3.dropErrorMessage
                  });
                }
              }
              this._dropAllQueued(options3.dropErrorMessage);
              return waitForExecuting(0);
            });
          })) : this.schedule({
            priority: NUM_PRIORITIES - 1,
            weight: 0
          }, () => {
            return waitForExecuting(1);
          });
          this._receive = function(job) {
            return job._reject(new Bottleneck3.prototype.BottleneckError(options3.enqueueErrorMessage));
          };
          this.stop = () => {
            return this.Promise.reject(new Bottleneck3.prototype.BottleneckError("stop() has already been called"));
          };
          return done;
        }
        _addToQueue(job) {
          var _this2 = this;
          return _asyncToGenerator2(function* () {
            var args, blocked, error2, options3, reachedHWM, shifted, strategy;
            args = job.args;
            options3 = job.options;
            try {
              var _ref2 = yield _this2._store.__submit__(_this2.queued(), options3.weight);
              reachedHWM = _ref2.reachedHWM;
              blocked = _ref2.blocked;
              strategy = _ref2.strategy;
            } catch (error1) {
              error2 = error1;
              _this2.Events.trigger("debug", `Could not queue ${options3.id}`, {
                args,
                options: options3,
                error: error2
              });
              job.doDrop({
                error: error2
              });
              return false;
            }
            if (blocked) {
              job.doDrop();
              return true;
            } else if (reachedHWM) {
              shifted = strategy === Bottleneck3.prototype.strategy.LEAK ? _this2._queues.shiftLastFrom(options3.priority) : strategy === Bottleneck3.prototype.strategy.OVERFLOW_PRIORITY ? _this2._queues.shiftLastFrom(options3.priority + 1) : strategy === Bottleneck3.prototype.strategy.OVERFLOW ? job : void 0;
              if (shifted != null) {
                shifted.doDrop();
              }
              if (shifted == null || strategy === Bottleneck3.prototype.strategy.OVERFLOW) {
                if (shifted == null) {
                  job.doDrop();
                }
                return reachedHWM;
              }
            }
            job.doQueue(reachedHWM, blocked);
            _this2._queues.push(job);
            yield _this2._drainAll();
            return reachedHWM;
          })();
        }
        _receive(job) {
          if (this._states.jobStatus(job.options.id) != null) {
            job._reject(new Bottleneck3.prototype.BottleneckError(`A job with the same id already exists (id=${job.options.id})`));
            return false;
          } else {
            job.doReceive();
            return this._submitLock.schedule(this._addToQueue, job);
          }
        }
        submit(...args) {
          var cb, fn, job, options3, ref, ref1, task;
          if (typeof args[0] === "function") {
            var _ref3, _ref4, _splice$call, _splice$call2;
            ref = args, _ref3 = ref, _ref4 = _toArray(_ref3), fn = _ref4[0], args = _ref4.slice(1), _ref3, _splice$call = splice.call(args, -1), _splice$call2 = _slicedToArray2(_splice$call, 1), cb = _splice$call2[0], _splice$call;
            options3 = parser2.load({}, this.jobDefaults);
          } else {
            var _ref5, _ref6, _splice$call3, _splice$call4;
            ref1 = args, _ref5 = ref1, _ref6 = _toArray(_ref5), options3 = _ref6[0], fn = _ref6[1], args = _ref6.slice(2), _ref5, _splice$call3 = splice.call(args, -1), _splice$call4 = _slicedToArray2(_splice$call3, 1), cb = _splice$call4[0], _splice$call3;
            options3 = parser2.load(options3, this.jobDefaults);
          }
          task = (...args2) => {
            return new this.Promise(function(resolve2, reject) {
              return fn(...args2, function(...args3) {
                return (args3[0] != null ? reject : resolve2)(args3);
              });
            });
          };
          job = new Job(task, args, options3, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
          job.promise.then(function(args2) {
            return typeof cb === "function" ? cb(...args2) : void 0;
          }).catch(function(args2) {
            if (Array.isArray(args2)) {
              return typeof cb === "function" ? cb(...args2) : void 0;
            } else {
              return typeof cb === "function" ? cb(args2) : void 0;
            }
          });
          return this._receive(job);
        }
        schedule(...args) {
          var job, options3, task;
          if (typeof args[0] === "function") {
            var _args = args;
            var _args2 = _toArray(_args);
            task = _args2[0];
            args = _args2.slice(1);
            options3 = {};
          } else {
            var _args3 = args;
            var _args4 = _toArray(_args3);
            options3 = _args4[0];
            task = _args4[1];
            args = _args4.slice(2);
          }
          job = new Job(task, args, options3, this.jobDefaults, this.rejectOnDrop, this.Events, this._states, this.Promise);
          this._receive(job);
          return job.promise;
        }
        wrap(fn) {
          var schedule, wrapped;
          schedule = this.schedule.bind(this);
          wrapped = function wrapped2(...args) {
            return schedule(fn.bind(this), ...args);
          };
          wrapped.withOptions = function(options3, ...args) {
            return schedule(options3, fn, ...args);
          };
          return wrapped;
        }
        updateSettings(options3 = {}) {
          var _this3 = this;
          return _asyncToGenerator2(function* () {
            yield _this3._store.__updateSettings__(parser2.overwrite(options3, _this3.storeDefaults));
            parser2.overwrite(options3, _this3.instanceDefaults, _this3);
            return _this3;
          })();
        }
        currentReservoir() {
          return this._store.__currentReservoir__();
        }
        incrementReservoir(incr = 0) {
          return this._store.__incrementReservoir__(incr);
        }
      }
      ;
      Bottleneck3.default = Bottleneck3;
      Bottleneck3.Events = Events2;
      Bottleneck3.version = Bottleneck3.prototype.version = require_version().version;
      Bottleneck3.strategy = Bottleneck3.prototype.strategy = {
        LEAK: 1,
        OVERFLOW: 2,
        OVERFLOW_PRIORITY: 4,
        BLOCK: 3
      };
      Bottleneck3.BottleneckError = Bottleneck3.prototype.BottleneckError = require_BottleneckError();
      Bottleneck3.Group = Bottleneck3.prototype.Group = require_Group();
      Bottleneck3.RedisConnection = Bottleneck3.prototype.RedisConnection = require_RedisConnection();
      Bottleneck3.IORedisConnection = Bottleneck3.prototype.IORedisConnection = require_IORedisConnection();
      Bottleneck3.Batcher = Bottleneck3.prototype.Batcher = require_Batcher();
      Bottleneck3.prototype.jobDefaults = {
        priority: DEFAULT_PRIORITY,
        weight: 1,
        expiration: null,
        id: "<no-id>"
      };
      Bottleneck3.prototype.storeDefaults = {
        maxConcurrent: null,
        minTime: 0,
        highWater: null,
        strategy: Bottleneck3.prototype.strategy.LEAK,
        penalty: null,
        reservoir: null,
        reservoirRefreshInterval: null,
        reservoirRefreshAmount: null,
        reservoirIncreaseInterval: null,
        reservoirIncreaseAmount: null,
        reservoirIncreaseMaximum: null
      };
      Bottleneck3.prototype.localStoreDefaults = {
        Promise,
        timeout: null,
        heartbeatInterval: 250
      };
      Bottleneck3.prototype.redisStoreDefaults = {
        Promise,
        timeout: null,
        heartbeatInterval: 5e3,
        clientTimeout: 1e4,
        Redis: null,
        clientOptions: {},
        clusterNodes: null,
        clearDatastore: false,
        connection: null
      };
      Bottleneck3.prototype.instanceDefaults = {
        datastore: "local",
        connection: null,
        id: "<no-id>",
        rejectOnDrop: true,
        trackDoneStatus: false,
        Promise
      };
      Bottleneck3.prototype.stopDefaults = {
        enqueueErrorMessage: "This limiter has been stopped and cannot accept new jobs.",
        dropWaitingJobs: true,
        dropErrorMessage: "This limiter has been stopped."
      };
      return Bottleneck3;
    }.call(void 0);
    module2.exports = Bottleneck2;
  }
});

// node_modules/bottleneck/lib/index.js
var require_lib = __commonJS({
  "node_modules/bottleneck/lib/index.js"(exports2, module2) {
    init_shims();
    "use strict";
    module2.exports = require_Bottleneck();
  }
});

// .svelte-kit/netlify/entry.js
__export(exports, {
  handler: () => handler
});
init_shims();

// .svelte-kit/output/server/app.js
init_shims();
var import_cookie = __toModule(require_cookie());

// node_modules/@lukeed/uuid/dist/index.mjs
init_shims();
var IDX = 256;
var HEX = [];
var BUFFER;
while (IDX--)
  HEX[IDX] = (IDX + 256).toString(16).substring(1);
function v4() {
  var i = 0, num, out = "";
  if (!BUFFER || IDX + 16 > 256) {
    BUFFER = Array(i = 256);
    while (i--)
      BUFFER[i] = 256 * Math.random() | 0;
    i = IDX = 0;
  }
  for (; i < 16; i++) {
    num = BUFFER[IDX + i];
    if (i == 6)
      out += HEX[num & 15 | 64];
    else if (i == 8)
      out += HEX[num & 63 | 128];
    else
      out += HEX[num];
    if (i & 1 && i > 1 && i < 11)
      out += "-";
  }
  IDX++;
  return out;
}

// .svelte-kit/output/server/app.js
var import_crypto_js = __toModule(require_crypto_js());
var import_object_resolve_path = __toModule(require_object_resolve_path());
var import_bottleneck = __toModule(require_lib());
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _map;
function get_single_valued_header(headers, key) {
  const value = headers[key];
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return void 0;
    }
    if (value.length > 1) {
      throw new Error(`Multiple headers provided for ${key}. Multiple may be provided only for set-cookie`);
    }
    return value[0];
  }
  return value;
}
function coalesce_to_error(err) {
  return err instanceof Error || err && err.name && err.message ? err : new Error(JSON.stringify(err));
}
function lowercase_keys(obj) {
  const clone2 = {};
  for (const key in obj) {
    clone2[key.toLowerCase()] = obj[key];
  }
  return clone2;
}
function error$1(body) {
  return {
    status: 500,
    body,
    headers: {}
  };
}
function is_string(s2) {
  return typeof s2 === "string" || s2 instanceof String;
}
function is_content_type_textual(content_type) {
  if (!content_type)
    return true;
  const [type] = content_type.split(";");
  return type === "text/plain" || type === "application/json" || type === "application/x-www-form-urlencoded" || type === "multipart/form-data";
}
async function render_endpoint(request, route, match) {
  const mod = await route.load();
  const handler2 = mod[request.method.toLowerCase().replace("delete", "del")];
  if (!handler2) {
    return;
  }
  const params = route.params(match);
  const response = await handler2({ ...request, params });
  const preface = `Invalid response from route ${request.path}`;
  if (!response) {
    return;
  }
  if (typeof response !== "object") {
    return error$1(`${preface}: expected an object, got ${typeof response}`);
  }
  let { status = 200, body, headers = {} } = response;
  headers = lowercase_keys(headers);
  const type = get_single_valued_header(headers, "content-type");
  const is_type_textual = is_content_type_textual(type);
  if (!is_type_textual && !(body instanceof Uint8Array || is_string(body))) {
    return error$1(`${preface}: body must be an instance of string or Uint8Array if content-type is not a supported textual content-type`);
  }
  let normalized_body;
  if ((typeof body === "object" || typeof body === "undefined") && !(body instanceof Uint8Array) && (!type || type.startsWith("application/json"))) {
    headers = { ...headers, "content-type": "application/json; charset=utf-8" };
    normalized_body = JSON.stringify(typeof body === "undefined" ? {} : body);
  } else {
    normalized_body = body;
  }
  return { status, body: normalized_body, headers };
}
var chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$";
var unsafeChars = /[<>\b\f\n\r\t\0\u2028\u2029]/g;
var reserved = /^(?:do|if|in|for|int|let|new|try|var|byte|case|char|else|enum|goto|long|this|void|with|await|break|catch|class|const|final|float|short|super|throw|while|yield|delete|double|export|import|native|return|switch|throws|typeof|boolean|default|extends|finally|package|private|abstract|continue|debugger|function|volatile|interface|protected|transient|implements|instanceof|synchronized)$/;
var escaped$1 = {
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
var objectProtoOwnPropertyNames = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function devalue(value) {
  var counts = new Map();
  function walk(thing) {
    if (typeof thing === "function") {
      throw new Error("Cannot stringify a function");
    }
    if (counts.has(thing)) {
      counts.set(thing, counts.get(thing) + 1);
      return;
    }
    counts.set(thing, 1);
    if (!isPrimitive(thing)) {
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
        case "Date":
        case "RegExp":
          return;
        case "Array":
          thing.forEach(walk);
          break;
        case "Set":
        case "Map":
          Array.from(thing).forEach(walk);
          break;
        default:
          var proto = Object.getPrototypeOf(thing);
          if (proto !== Object.prototype && proto !== null && Object.getOwnPropertyNames(proto).sort().join("\0") !== objectProtoOwnPropertyNames) {
            throw new Error("Cannot stringify arbitrary non-POJOs");
          }
          if (Object.getOwnPropertySymbols(thing).length > 0) {
            throw new Error("Cannot stringify POJOs with symbolic keys");
          }
          Object.keys(thing).forEach(function(key) {
            return walk(thing[key]);
          });
      }
    }
  }
  walk(value);
  var names = new Map();
  Array.from(counts).filter(function(entry) {
    return entry[1] > 1;
  }).sort(function(a, b) {
    return b[1] - a[1];
  }).forEach(function(entry, i) {
    names.set(entry[0], getName(i));
  });
  function stringify(thing) {
    if (names.has(thing)) {
      return names.get(thing);
    }
    if (isPrimitive(thing)) {
      return stringifyPrimitive(thing);
    }
    var type = getType(thing);
    switch (type) {
      case "Number":
      case "String":
      case "Boolean":
        return "Object(" + stringify(thing.valueOf()) + ")";
      case "RegExp":
        return "new RegExp(" + stringifyString(thing.source) + ', "' + thing.flags + '")';
      case "Date":
        return "new Date(" + thing.getTime() + ")";
      case "Array":
        var members = thing.map(function(v, i) {
          return i in thing ? stringify(v) : "";
        });
        var tail = thing.length === 0 || thing.length - 1 in thing ? "" : ",";
        return "[" + members.join(",") + tail + "]";
      case "Set":
      case "Map":
        return "new " + type + "([" + Array.from(thing).map(stringify).join(",") + "])";
      default:
        var obj = "{" + Object.keys(thing).map(function(key) {
          return safeKey(key) + ":" + stringify(thing[key]);
        }).join(",") + "}";
        var proto = Object.getPrototypeOf(thing);
        if (proto === null) {
          return Object.keys(thing).length > 0 ? "Object.assign(Object.create(null)," + obj + ")" : "Object.create(null)";
        }
        return obj;
    }
  }
  var str = stringify(value);
  if (names.size) {
    var params_1 = [];
    var statements_1 = [];
    var values_1 = [];
    names.forEach(function(name, thing) {
      params_1.push(name);
      if (isPrimitive(thing)) {
        values_1.push(stringifyPrimitive(thing));
        return;
      }
      var type = getType(thing);
      switch (type) {
        case "Number":
        case "String":
        case "Boolean":
          values_1.push("Object(" + stringify(thing.valueOf()) + ")");
          break;
        case "RegExp":
          values_1.push(thing.toString());
          break;
        case "Date":
          values_1.push("new Date(" + thing.getTime() + ")");
          break;
        case "Array":
          values_1.push("Array(" + thing.length + ")");
          thing.forEach(function(v, i) {
            statements_1.push(name + "[" + i + "]=" + stringify(v));
          });
          break;
        case "Set":
          values_1.push("new Set");
          statements_1.push(name + "." + Array.from(thing).map(function(v) {
            return "add(" + stringify(v) + ")";
          }).join("."));
          break;
        case "Map":
          values_1.push("new Map");
          statements_1.push(name + "." + Array.from(thing).map(function(_a) {
            var k = _a[0], v = _a[1];
            return "set(" + stringify(k) + ", " + stringify(v) + ")";
          }).join("."));
          break;
        default:
          values_1.push(Object.getPrototypeOf(thing) === null ? "Object.create(null)" : "{}");
          Object.keys(thing).forEach(function(key) {
            statements_1.push("" + name + safeProp(key) + "=" + stringify(thing[key]));
          });
      }
    });
    statements_1.push("return " + str);
    return "(function(" + params_1.join(",") + "){" + statements_1.join(";") + "}(" + values_1.join(",") + "))";
  } else {
    return str;
  }
}
function getName(num) {
  var name = "";
  do {
    name = chars[num % chars.length] + name;
    num = ~~(num / chars.length) - 1;
  } while (num >= 0);
  return reserved.test(name) ? name + "_" : name;
}
function isPrimitive(thing) {
  return Object(thing) !== thing;
}
function stringifyPrimitive(thing) {
  if (typeof thing === "string")
    return stringifyString(thing);
  if (thing === void 0)
    return "void 0";
  if (thing === 0 && 1 / thing < 0)
    return "-0";
  var str = String(thing);
  if (typeof thing === "number")
    return str.replace(/^(-)?0\./, "$1.");
  return str;
}
function getType(thing) {
  return Object.prototype.toString.call(thing).slice(8, -1);
}
function escapeUnsafeChar(c) {
  return escaped$1[c] || c;
}
function escapeUnsafeChars(str) {
  return str.replace(unsafeChars, escapeUnsafeChar);
}
function safeKey(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? key : escapeUnsafeChars(JSON.stringify(key));
}
function safeProp(key) {
  return /^[_$a-zA-Z][_$a-zA-Z0-9]*$/.test(key) ? "." + key : "[" + escapeUnsafeChars(JSON.stringify(key)) + "]";
}
function stringifyString(str) {
  var result = '"';
  for (var i = 0; i < str.length; i += 1) {
    var char = str.charAt(i);
    var code = char.charCodeAt(0);
    if (char === '"') {
      result += '\\"';
    } else if (char in escaped$1) {
      result += escaped$1[char];
    } else if (code >= 55296 && code <= 57343) {
      var next = str.charCodeAt(i + 1);
      if (code <= 56319 && (next >= 56320 && next <= 57343)) {
        result += char + str[++i];
      } else {
        result += "\\u" + code.toString(16).toUpperCase();
      }
    } else {
      result += char;
    }
  }
  result += '"';
  return result;
}
function noop$1() {
}
function safe_not_equal$1(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
Promise.resolve();
var subscriber_queue$1 = [];
function writable$1(value, start = noop$1) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal$1(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue$1.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue$1.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue$1.length; i += 2) {
            subscriber_queue$1[i][0](subscriber_queue$1[i + 1]);
          }
          subscriber_queue$1.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop$1) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop$1;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
function hash(value) {
  let hash2 = 5381;
  let i = value.length;
  if (typeof value === "string") {
    while (i)
      hash2 = hash2 * 33 ^ value.charCodeAt(--i);
  } else {
    while (i)
      hash2 = hash2 * 33 ^ value[--i];
  }
  return (hash2 >>> 0).toString(36);
}
var escape_json_string_in_html_dict = {
  '"': '\\"',
  "<": "\\u003C",
  ">": "\\u003E",
  "/": "\\u002F",
  "\\": "\\\\",
  "\b": "\\b",
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "	": "\\t",
  "\0": "\\0",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029"
};
function escape_json_string_in_html(str) {
  return escape$1(str, escape_json_string_in_html_dict, (code) => `\\u${code.toString(16).toUpperCase()}`);
}
var escape_html_attr_dict = {
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;"
};
function escape_html_attr(str) {
  return '"' + escape$1(str, escape_html_attr_dict, (code) => `&#${code};`) + '"';
}
function escape$1(str, dict, unicode_encoder) {
  let result = "";
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charAt(i);
    const code = char.charCodeAt(0);
    if (char in dict) {
      result += dict[char];
    } else if (code >= 55296 && code <= 57343) {
      const next = str.charCodeAt(i + 1);
      if (code <= 56319 && next >= 56320 && next <= 57343) {
        result += char + str[++i];
      } else {
        result += unicode_encoder(code);
      }
    } else {
      result += char;
    }
  }
  return result;
}
var s$1 = JSON.stringify;
async function render_response({
  branch,
  options: options22,
  $session,
  page_config,
  status,
  error: error2,
  page: page2
}) {
  const css2 = new Set(options22.entry.css);
  const js = new Set(options22.entry.js);
  const styles = new Set();
  const serialized_data = [];
  let rendered;
  let is_private = false;
  let maxage;
  if (error2) {
    error2.stack = options22.get_stack(error2);
  }
  if (page_config.ssr) {
    branch.forEach(({ node, loaded, fetched, uses_credentials }) => {
      if (node.css)
        node.css.forEach((url) => css2.add(url));
      if (node.js)
        node.js.forEach((url) => js.add(url));
      if (node.styles)
        node.styles.forEach((content) => styles.add(content));
      if (fetched && page_config.hydrate)
        serialized_data.push(...fetched);
      if (uses_credentials)
        is_private = true;
      maxage = loaded.maxage;
    });
    const session = writable$1($session);
    const props = {
      stores: {
        page: writable$1(null),
        navigating: writable$1(null),
        session
      },
      page: page2,
      components: branch.map(({ node }) => node.module.default)
    };
    for (let i = 0; i < branch.length; i += 1) {
      props[`props_${i}`] = await branch[i].loaded.props;
    }
    let session_tracking_active = false;
    const unsubscribe = session.subscribe(() => {
      if (session_tracking_active)
        is_private = true;
    });
    session_tracking_active = true;
    try {
      rendered = options22.root.render(props);
    } finally {
      unsubscribe();
    }
  } else {
    rendered = { head: "", html: "", css: { code: "", map: null } };
  }
  const include_js = page_config.router || page_config.hydrate;
  if (!include_js)
    js.clear();
  const links = options22.amp ? styles.size > 0 || rendered.css.code.length > 0 ? `<style amp-custom>${Array.from(styles).concat(rendered.css.code).join("\n")}</style>` : "" : [
    ...Array.from(js).map((dep) => `<link rel="modulepreload" href="${dep}">`),
    ...Array.from(css2).map((dep) => `<link rel="stylesheet" href="${dep}">`)
  ].join("\n		");
  let init2 = "";
  if (options22.amp) {
    init2 = `
		<style amp-boilerplate>body{-webkit-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-moz-animation:-amp-start 8s steps(1,end) 0s 1 normal both;-ms-animation:-amp-start 8s steps(1,end) 0s 1 normal both;animation:-amp-start 8s steps(1,end) 0s 1 normal both}@-webkit-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-moz-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-ms-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@-o-keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}@keyframes -amp-start{from{visibility:hidden}to{visibility:visible}}</style>
		<noscript><style amp-boilerplate>body{-webkit-animation:none;-moz-animation:none;-ms-animation:none;animation:none}</style></noscript>
		<script async src="https://cdn.ampproject.org/v0.js"><\/script>`;
  } else if (include_js) {
    init2 = `<script type="module">
			import { start } from ${s$1(options22.entry.file)};
			start({
				target: ${options22.target ? `document.querySelector(${s$1(options22.target)})` : "document.body"},
				paths: ${s$1(options22.paths)},
				session: ${try_serialize($session, (error3) => {
      throw new Error(`Failed to serialize session data: ${error3.message}`);
    })},
				host: ${page2 && page2.host ? s$1(page2.host) : "location.host"},
				route: ${!!page_config.router},
				spa: ${!page_config.ssr},
				trailing_slash: ${s$1(options22.trailing_slash)},
				hydrate: ${page_config.ssr && page_config.hydrate ? `{
					status: ${status},
					error: ${serialize_error(error2)},
					nodes: [
						${(branch || []).map(({ node }) => `import(${s$1(node.entry)})`).join(",\n						")}
					],
					page: {
						host: ${page2 && page2.host ? s$1(page2.host) : "location.host"}, // TODO this is redundant
						path: ${s$1(page2 && page2.path)},
						query: new URLSearchParams(${page2 ? s$1(page2.query.toString()) : ""}),
						params: ${page2 && s$1(page2.params)}
					}
				}` : "null"}
			});
		<\/script>`;
  }
  if (options22.service_worker) {
    init2 += `<script>
			if ('serviceWorker' in navigator) {
				navigator.serviceWorker.register('${options22.service_worker}');
			}
		<\/script>`;
  }
  const head = [
    rendered.head,
    styles.size && !options22.amp ? `<style data-svelte>${Array.from(styles).join("\n")}</style>` : "",
    links,
    init2
  ].join("\n\n		");
  const body = options22.amp ? rendered.html : `${rendered.html}

			${serialized_data.map(({ url, body: body2, json }) => {
    let attributes = `type="application/json" data-type="svelte-data" data-url=${escape_html_attr(url)}`;
    if (body2)
      attributes += ` data-body="${hash(body2)}"`;
    return `<script ${attributes}>${json}<\/script>`;
  }).join("\n\n	")}
		`;
  const headers = {
    "content-type": "text/html"
  };
  if (maxage) {
    headers["cache-control"] = `${is_private ? "private" : "public"}, max-age=${maxage}`;
  }
  if (!options22.floc) {
    headers["permissions-policy"] = "interest-cohort=()";
  }
  return {
    status,
    headers,
    body: options22.template({ head, body })
  };
}
function try_serialize(data, fail) {
  try {
    return devalue(data);
  } catch (err) {
    if (fail)
      fail(coalesce_to_error(err));
    return null;
  }
}
function serialize_error(error2) {
  if (!error2)
    return null;
  let serialized = try_serialize(error2);
  if (!serialized) {
    const { name, message, stack } = error2;
    serialized = try_serialize({ ...error2, name, message, stack });
  }
  if (!serialized) {
    serialized = "{}";
  }
  return serialized;
}
function normalize(loaded) {
  const has_error_status = loaded.status && loaded.status >= 400 && loaded.status <= 599 && !loaded.redirect;
  if (loaded.error || has_error_status) {
    const status = loaded.status;
    if (!loaded.error && has_error_status) {
      return {
        status: status || 500,
        error: new Error()
      };
    }
    const error2 = typeof loaded.error === "string" ? new Error(loaded.error) : loaded.error;
    if (!(error2 instanceof Error)) {
      return {
        status: 500,
        error: new Error(`"error" property returned from load() must be a string or instance of Error, received type "${typeof error2}"`)
      };
    }
    if (!status || status < 400 || status > 599) {
      console.warn('"error" returned from load() without a valid status code \u2014 defaulting to 500');
      return { status: 500, error: error2 };
    }
    return { status, error: error2 };
  }
  if (loaded.redirect) {
    if (!loaded.status || Math.floor(loaded.status / 100) !== 3) {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be accompanied by a 3xx status code')
      };
    }
    if (typeof loaded.redirect !== "string") {
      return {
        status: 500,
        error: new Error('"redirect" property returned from load() must be a string')
      };
    }
  }
  if (loaded.context) {
    throw new Error('You are returning "context" from a load function. "context" was renamed to "stuff", please adjust your code accordingly.');
  }
  return loaded;
}
var s = JSON.stringify;
async function load_node({
  request,
  options: options22,
  state,
  route,
  page: page2,
  node,
  $session,
  stuff,
  prerender_enabled,
  is_leaf,
  is_error,
  status,
  error: error2
}) {
  const { module: module2 } = node;
  let uses_credentials = false;
  const fetched = [];
  let set_cookie_headers = [];
  let loaded;
  const page_proxy = new Proxy(page2, {
    get: (target, prop, receiver) => {
      if (prop === "query" && prerender_enabled) {
        throw new Error("Cannot access query on a page with prerendering enabled");
      }
      return Reflect.get(target, prop, receiver);
    }
  });
  if (module2.load) {
    const load_input = {
      page: page_proxy,
      get session() {
        uses_credentials = true;
        return $session;
      },
      fetch: async (resource, opts = {}) => {
        let url;
        if (typeof resource === "string") {
          url = resource;
        } else {
          url = resource.url;
          opts = {
            method: resource.method,
            headers: resource.headers,
            body: resource.body,
            mode: resource.mode,
            credentials: resource.credentials,
            cache: resource.cache,
            redirect: resource.redirect,
            referrer: resource.referrer,
            integrity: resource.integrity,
            ...opts
          };
        }
        const resolved = resolve(request.path, url.split("?")[0]);
        let response;
        const filename = resolved.replace(options22.paths.assets, "").slice(1);
        const filename_html = `${filename}/index.html`;
        const asset = options22.manifest.assets.find((d2) => d2.file === filename || d2.file === filename_html);
        if (asset) {
          response = options22.read ? new Response(options22.read(asset.file), {
            headers: asset.type ? { "content-type": asset.type } : {}
          }) : await fetch(`http://${page2.host}/${asset.file}`, opts);
        } else if (resolved.startsWith("/") && !resolved.startsWith("//")) {
          const relative = resolved;
          const headers = {
            ...opts.headers
          };
          if (opts.credentials !== "omit") {
            uses_credentials = true;
            headers.cookie = request.headers.cookie;
            if (!headers.authorization) {
              headers.authorization = request.headers.authorization;
            }
          }
          if (opts.body && typeof opts.body !== "string") {
            throw new Error("Request body must be a string");
          }
          const search = url.includes("?") ? url.slice(url.indexOf("?") + 1) : "";
          const rendered = await respond({
            host: request.host,
            method: opts.method || "GET",
            headers,
            path: relative,
            rawBody: opts.body == null ? null : new TextEncoder().encode(opts.body),
            query: new URLSearchParams(search)
          }, options22, {
            fetched: url,
            initiator: route
          });
          if (rendered) {
            if (state.prerender) {
              state.prerender.dependencies.set(relative, rendered);
            }
            response = new Response(rendered.body, {
              status: rendered.status,
              headers: rendered.headers
            });
          }
        } else {
          if (resolved.startsWith("//")) {
            throw new Error(`Cannot request protocol-relative URL (${url}) in server-side fetch`);
          }
          if (typeof request.host !== "undefined") {
            const { hostname: fetch_hostname } = new URL(url);
            const [server_hostname] = request.host.split(":");
            if (`.${fetch_hostname}`.endsWith(`.${server_hostname}`) && opts.credentials !== "omit") {
              uses_credentials = true;
              opts.headers = {
                ...opts.headers,
                cookie: request.headers.cookie
              };
            }
          }
          const external_request = new Request(url, opts);
          response = await options22.hooks.externalFetch.call(null, external_request);
        }
        if (response) {
          const proxy = new Proxy(response, {
            get(response2, key, receiver) {
              async function text() {
                const body = await response2.text();
                const headers = {};
                for (const [key2, value] of response2.headers) {
                  if (key2 === "set-cookie") {
                    set_cookie_headers = set_cookie_headers.concat(value);
                  } else if (key2 !== "etag") {
                    headers[key2] = value;
                  }
                }
                if (!opts.body || typeof opts.body === "string") {
                  fetched.push({
                    url,
                    body: opts.body,
                    json: `{"status":${response2.status},"statusText":${s(response2.statusText)},"headers":${s(headers)},"body":"${escape_json_string_in_html(body)}"}`
                  });
                }
                return body;
              }
              if (key === "text") {
                return text;
              }
              if (key === "json") {
                return async () => {
                  return JSON.parse(await text());
                };
              }
              return Reflect.get(response2, key, response2);
            }
          });
          return proxy;
        }
        return response || new Response("Not found", {
          status: 404
        });
      },
      stuff: { ...stuff }
    };
    if (is_error) {
      load_input.status = status;
      load_input.error = error2;
    }
    loaded = await module2.load.call(null, load_input);
  } else {
    loaded = {};
  }
  if (!loaded && is_leaf && !is_error)
    return;
  if (!loaded) {
    throw new Error(`${node.entry} - load must return a value except for page fall through`);
  }
  return {
    node,
    loaded: normalize(loaded),
    stuff: loaded.stuff || stuff,
    fetched,
    set_cookie_headers,
    uses_credentials
  };
}
var absolute = /^([a-z]+:)?\/?\//;
function resolve(base2, path) {
  const base_match = absolute.exec(base2);
  const path_match = absolute.exec(path);
  if (!base_match) {
    throw new Error(`bad base path: "${base2}"`);
  }
  const baseparts = path_match ? [] : base2.slice(base_match[0].length).split("/");
  const pathparts = path_match ? path.slice(path_match[0].length).split("/") : path.split("/");
  baseparts.pop();
  for (let i = 0; i < pathparts.length; i += 1) {
    const part = pathparts[i];
    if (part === ".")
      continue;
    else if (part === "..")
      baseparts.pop();
    else
      baseparts.push(part);
  }
  const prefix = path_match && path_match[0] || base_match && base_match[0] || "";
  return `${prefix}${baseparts.join("/")}`;
}
async function respond_with_error({ request, options: options22, state, $session, status, error: error2 }) {
  const default_layout = await options22.load_component(options22.manifest.layout);
  const default_error = await options22.load_component(options22.manifest.error);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params: {}
  };
  const loaded = await load_node({
    request,
    options: options22,
    state,
    route: null,
    page: page2,
    node: default_layout,
    $session,
    stuff: {},
    prerender_enabled: is_prerender_enabled(options22, default_error, state),
    is_leaf: false,
    is_error: false
  });
  const branch = [
    loaded,
    await load_node({
      request,
      options: options22,
      state,
      route: null,
      page: page2,
      node: default_error,
      $session,
      stuff: loaded ? loaded.stuff : {},
      prerender_enabled: is_prerender_enabled(options22, default_error, state),
      is_leaf: false,
      is_error: true,
      status,
      error: error2
    })
  ];
  try {
    return await render_response({
      options: options22,
      $session,
      page_config: {
        hydrate: options22.hydrate,
        router: options22.router,
        ssr: options22.ssr
      },
      status,
      error: error2,
      branch,
      page: page2
    });
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options22.handle_error(error3, request);
    return {
      status: 500,
      headers: {},
      body: error3.stack
    };
  }
}
function is_prerender_enabled(options22, node, state) {
  return options22.prerender && (!!node.module.prerender || !!state.prerender && state.prerender.all);
}
async function respond$1(opts) {
  const { request, options: options22, state, $session, route } = opts;
  let nodes;
  try {
    nodes = await Promise.all(route.a.map((id) => id ? options22.load_component(id) : void 0));
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options22.handle_error(error3, request);
    return await respond_with_error({
      request,
      options: options22,
      state,
      $session,
      status: 500,
      error: error3
    });
  }
  const leaf = nodes[nodes.length - 1].module;
  let page_config = get_page_config(leaf, options22);
  if (!leaf.prerender && state.prerender && !state.prerender.all) {
    return {
      status: 204,
      headers: {},
      body: ""
    };
  }
  let branch = [];
  let status = 200;
  let error2;
  let set_cookie_headers = [];
  ssr:
    if (page_config.ssr) {
      let stuff = {};
      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        let loaded;
        if (node) {
          try {
            loaded = await load_node({
              ...opts,
              node,
              stuff,
              prerender_enabled: is_prerender_enabled(options22, node, state),
              is_leaf: i === nodes.length - 1,
              is_error: false
            });
            if (!loaded)
              return;
            set_cookie_headers = set_cookie_headers.concat(loaded.set_cookie_headers);
            if (loaded.loaded.redirect) {
              return with_cookies({
                status: loaded.loaded.status,
                headers: {
                  location: encodeURI(loaded.loaded.redirect)
                }
              }, set_cookie_headers);
            }
            if (loaded.loaded.error) {
              ({ status, error: error2 } = loaded.loaded);
            }
          } catch (err) {
            const e = coalesce_to_error(err);
            options22.handle_error(e, request);
            status = 500;
            error2 = e;
          }
          if (loaded && !error2) {
            branch.push(loaded);
          }
          if (error2) {
            while (i--) {
              if (route.b[i]) {
                const error_node = await options22.load_component(route.b[i]);
                let node_loaded;
                let j = i;
                while (!(node_loaded = branch[j])) {
                  j -= 1;
                }
                try {
                  const error_loaded = await load_node({
                    ...opts,
                    node: error_node,
                    stuff: node_loaded.stuff,
                    prerender_enabled: is_prerender_enabled(options22, error_node, state),
                    is_leaf: false,
                    is_error: true,
                    status,
                    error: error2
                  });
                  if (error_loaded.loaded.error) {
                    continue;
                  }
                  page_config = get_page_config(error_node.module, options22);
                  branch = branch.slice(0, j + 1).concat(error_loaded);
                  break ssr;
                } catch (err) {
                  const e = coalesce_to_error(err);
                  options22.handle_error(e, request);
                  continue;
                }
              }
            }
            return with_cookies(await respond_with_error({
              request,
              options: options22,
              state,
              $session,
              status,
              error: error2
            }), set_cookie_headers);
          }
        }
        if (loaded && loaded.loaded.stuff) {
          stuff = {
            ...stuff,
            ...loaded.loaded.stuff
          };
        }
      }
    }
  try {
    return with_cookies(await render_response({
      ...opts,
      page_config,
      status,
      error: error2,
      branch: branch.filter(Boolean)
    }), set_cookie_headers);
  } catch (err) {
    const error3 = coalesce_to_error(err);
    options22.handle_error(error3, request);
    return with_cookies(await respond_with_error({
      ...opts,
      status: 500,
      error: error3
    }), set_cookie_headers);
  }
}
function get_page_config(leaf, options22) {
  return {
    ssr: "ssr" in leaf ? !!leaf.ssr : options22.ssr,
    router: "router" in leaf ? !!leaf.router : options22.router,
    hydrate: "hydrate" in leaf ? !!leaf.hydrate : options22.hydrate
  };
}
function with_cookies(response, set_cookie_headers) {
  if (set_cookie_headers.length) {
    response.headers["set-cookie"] = set_cookie_headers;
  }
  return response;
}
async function render_page(request, route, match, options22, state) {
  if (state.initiator === route) {
    return {
      status: 404,
      headers: {},
      body: `Not found: ${request.path}`
    };
  }
  const params = route.params(match);
  const page2 = {
    host: request.host,
    path: request.path,
    query: request.query,
    params
  };
  const $session = await options22.hooks.getSession(request);
  const response = await respond$1({
    request,
    options: options22,
    state,
    $session,
    route,
    page: page2
  });
  if (response) {
    return response;
  }
  if (state.fetched) {
    return {
      status: 500,
      headers: {},
      body: `Bad request in load function: failed to fetch ${state.fetched}`
    };
  }
}
function read_only_form_data() {
  const map = new Map();
  return {
    append(key, value) {
      if (map.has(key)) {
        (map.get(key) || []).push(value);
      } else {
        map.set(key, [value]);
      }
    },
    data: new ReadOnlyFormData(map)
  };
}
var ReadOnlyFormData = class {
  constructor(map) {
    __privateAdd(this, _map, void 0);
    __privateSet(this, _map, map);
  }
  get(key) {
    const value = __privateGet(this, _map).get(key);
    return value && value[0];
  }
  getAll(key) {
    return __privateGet(this, _map).get(key);
  }
  has(key) {
    return __privateGet(this, _map).has(key);
  }
  *[Symbol.iterator]() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *entries() {
    for (const [key, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield [key, value[i]];
      }
    }
  }
  *keys() {
    for (const [key] of __privateGet(this, _map))
      yield key;
  }
  *values() {
    for (const [, value] of __privateGet(this, _map)) {
      for (let i = 0; i < value.length; i += 1) {
        yield value[i];
      }
    }
  }
};
_map = new WeakMap();
function parse_body(raw, headers) {
  if (!raw)
    return raw;
  const content_type = headers["content-type"];
  const [type, ...directives] = content_type ? content_type.split(/;\s*/) : [];
  const text = () => new TextDecoder(headers["content-encoding"] || "utf-8").decode(raw);
  switch (type) {
    case "text/plain":
      return text();
    case "application/json":
      return JSON.parse(text());
    case "application/x-www-form-urlencoded":
      return get_urlencoded(text());
    case "multipart/form-data": {
      const boundary = directives.find((directive) => directive.startsWith("boundary="));
      if (!boundary)
        throw new Error("Missing boundary");
      return get_multipart(text(), boundary.slice("boundary=".length));
    }
    default:
      return raw;
  }
}
function get_urlencoded(text) {
  const { data, append } = read_only_form_data();
  text.replace(/\+/g, " ").split("&").forEach((str) => {
    const [key, value] = str.split("=");
    append(decodeURIComponent(key), decodeURIComponent(value));
  });
  return data;
}
function get_multipart(text, boundary) {
  const parts = text.split(`--${boundary}`);
  if (parts[0] !== "" || parts[parts.length - 1].trim() !== "--") {
    throw new Error("Malformed form data");
  }
  const { data, append } = read_only_form_data();
  parts.slice(1, -1).forEach((part) => {
    const match = /\s*([\s\S]+?)\r\n\r\n([\s\S]*)\s*/.exec(part);
    if (!match) {
      throw new Error("Malformed form data");
    }
    const raw_headers = match[1];
    const body = match[2].trim();
    let key;
    const headers = {};
    raw_headers.split("\r\n").forEach((str) => {
      const [raw_header, ...raw_directives] = str.split("; ");
      let [name, value] = raw_header.split(": ");
      name = name.toLowerCase();
      headers[name] = value;
      const directives = {};
      raw_directives.forEach((raw_directive) => {
        const [name2, value2] = raw_directive.split("=");
        directives[name2] = JSON.parse(value2);
      });
      if (name === "content-disposition") {
        if (value !== "form-data")
          throw new Error("Malformed form data");
        if (directives.filename) {
          throw new Error("File upload is not yet implemented");
        }
        if (directives.name) {
          key = directives.name;
        }
      }
    });
    if (!key)
      throw new Error("Malformed form data");
    append(key, body);
  });
  return data;
}
async function respond(incoming, options22, state = {}) {
  if (incoming.path !== "/" && options22.trailing_slash !== "ignore") {
    const has_trailing_slash = incoming.path.endsWith("/");
    if (has_trailing_slash && options22.trailing_slash === "never" || !has_trailing_slash && options22.trailing_slash === "always" && !(incoming.path.split("/").pop() || "").includes(".")) {
      const path = has_trailing_slash ? incoming.path.slice(0, -1) : incoming.path + "/";
      const q = incoming.query.toString();
      return {
        status: 301,
        headers: {
          location: options22.paths.base + path + (q ? `?${q}` : "")
        }
      };
    }
  }
  const headers = lowercase_keys(incoming.headers);
  const request = {
    ...incoming,
    headers,
    body: parse_body(incoming.rawBody, headers),
    params: {},
    locals: {}
  };
  try {
    return await options22.hooks.handle({
      request,
      resolve: async (request2) => {
        if (state.prerender && state.prerender.fallback) {
          return await render_response({
            options: options22,
            $session: await options22.hooks.getSession(request2),
            page_config: { ssr: false, router: true, hydrate: true },
            status: 200,
            branch: []
          });
        }
        const decoded = decodeURI(request2.path);
        for (const route of options22.manifest.routes) {
          const match = route.pattern.exec(decoded);
          if (!match)
            continue;
          const response = route.type === "endpoint" ? await render_endpoint(request2, route, match) : await render_page(request2, route, match, options22, state);
          if (response) {
            if (response.status === 200) {
              const cache_control = get_single_valued_header(response.headers, "cache-control");
              if (!cache_control || !/(no-store|immutable)/.test(cache_control)) {
                const etag = `"${hash(response.body || "")}"`;
                if (request2.headers["if-none-match"] === etag) {
                  return {
                    status: 304,
                    headers: {},
                    body: ""
                  };
                }
                response.headers["etag"] = etag;
              }
            }
            return response;
          }
        }
        const $session = await options22.hooks.getSession(request2);
        return await respond_with_error({
          request: request2,
          options: options22,
          state,
          $session,
          status: 404,
          error: new Error(`Not found: ${request2.path}`)
        });
      }
    });
  } catch (err) {
    const e = coalesce_to_error(err);
    options22.handle_error(e, request);
    return {
      status: 500,
      headers: {},
      body: options22.dev ? e.stack : e.message
    };
  }
}
function noop() {
}
function run(fn) {
  return fn();
}
function blank_object() {
  return Object.create(null);
}
function run_all(fns) {
  fns.forEach(run);
}
function is_function(thing) {
  return typeof thing === "function";
}
function safe_not_equal(a, b) {
  return a != a ? b == b : a !== b || (a && typeof a === "object" || typeof a === "function");
}
function subscribe(store, ...callbacks) {
  if (store == null) {
    return noop;
  }
  const unsub = store.subscribe(...callbacks);
  return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
}
function get_store_value(store) {
  let value;
  subscribe(store, (_) => value = _)();
  return value;
}
function compute_rest_props(props, keys) {
  const rest = {};
  keys = new Set(keys);
  for (const k in props)
    if (!keys.has(k) && k[0] !== "$")
      rest[k] = props[k];
  return rest;
}
function set_store_value(store, ret, value) {
  store.set(value);
  return ret;
}
function custom_event(type, detail, bubbles = false) {
  const e = document.createEvent("CustomEvent");
  e.initCustomEvent(type, bubbles, false, detail);
  return e;
}
var current_component;
function set_current_component(component) {
  current_component = component;
}
function get_current_component() {
  if (!current_component)
    throw new Error("Function called outside component initialization");
  return current_component;
}
function createEventDispatcher() {
  const component = get_current_component();
  return (type, detail) => {
    const callbacks = component.$$.callbacks[type];
    if (callbacks) {
      const event = custom_event(type, detail);
      callbacks.slice().forEach((fn) => {
        fn.call(component, event);
      });
    }
  };
}
function setContext(key, context) {
  get_current_component().$$.context.set(key, context);
}
function getContext(key) {
  return get_current_component().$$.context.get(key);
}
Promise.resolve();
var globals = typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : global;
var boolean_attributes = new Set([
  "allowfullscreen",
  "allowpaymentrequest",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "ismap",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
]);
var invalid_attribute_name_character = /[\s'">/=\u{FDD0}-\u{FDEF}\u{FFFE}\u{FFFF}\u{1FFFE}\u{1FFFF}\u{2FFFE}\u{2FFFF}\u{3FFFE}\u{3FFFF}\u{4FFFE}\u{4FFFF}\u{5FFFE}\u{5FFFF}\u{6FFFE}\u{6FFFF}\u{7FFFE}\u{7FFFF}\u{8FFFE}\u{8FFFF}\u{9FFFE}\u{9FFFF}\u{AFFFE}\u{AFFFF}\u{BFFFE}\u{BFFFF}\u{CFFFE}\u{CFFFF}\u{DFFFE}\u{DFFFF}\u{EFFFE}\u{EFFFF}\u{FFFFE}\u{FFFFF}\u{10FFFE}\u{10FFFF}]/u;
function spread(args, classes_to_add) {
  const attributes = Object.assign({}, ...args);
  if (classes_to_add) {
    if (attributes.class == null) {
      attributes.class = classes_to_add;
    } else {
      attributes.class += " " + classes_to_add;
    }
  }
  let str = "";
  Object.keys(attributes).forEach((name) => {
    if (invalid_attribute_name_character.test(name))
      return;
    const value = attributes[name];
    if (value === true)
      str += " " + name;
    else if (boolean_attributes.has(name.toLowerCase())) {
      if (value)
        str += " " + name;
    } else if (value != null) {
      str += ` ${name}="${value}"`;
    }
  });
  return str;
}
var escaped = {
  '"': "&quot;",
  "'": "&#39;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
function escape2(html) {
  return String(html).replace(/["'&<>]/g, (match) => escaped[match]);
}
function escape_attribute_value(value) {
  return typeof value === "string" ? escape2(value) : value;
}
function escape_object(obj) {
  const result = {};
  for (const key in obj) {
    result[key] = escape_attribute_value(obj[key]);
  }
  return result;
}
function each(items, fn) {
  let str = "";
  for (let i = 0; i < items.length; i += 1) {
    str += fn(items[i], i);
  }
  return str;
}
var missing_component = {
  $$render: () => ""
};
function validate_component(component, name) {
  if (!component || !component.$$render) {
    if (name === "svelte:component")
      name += " this={...}";
    throw new Error(`<${name}> is not a valid SSR component. You may need to review your build config to ensure that dependencies are compiled, rather than imported as pre-compiled modules`);
  }
  return component;
}
var on_destroy;
function create_ssr_component(fn) {
  function $$render(result, props, bindings, slots, context) {
    const parent_component = current_component;
    const $$ = {
      on_destroy,
      context: new Map(context || (parent_component ? parent_component.$$.context : [])),
      on_mount: [],
      before_update: [],
      after_update: [],
      callbacks: blank_object()
    };
    set_current_component({ $$ });
    const html = fn(result, props, bindings, slots);
    set_current_component(parent_component);
    return html;
  }
  return {
    render: (props = {}, { $$slots = {}, context = new Map() } = {}) => {
      on_destroy = [];
      const result = { title: "", head: "", css: new Set() };
      const html = $$render(result, props, {}, $$slots, context);
      run_all(on_destroy);
      return {
        html,
        css: {
          code: Array.from(result.css).map((css2) => css2.code).join("\n"),
          map: null
        },
        head: result.title + result.head
      };
    },
    $$render
  };
}
function add_attribute(name, value, boolean) {
  if (value == null || boolean && !value)
    return "";
  return ` ${name}${value === true ? "" : `=${typeof value === "string" ? JSON.stringify(escape2(value)) : `"${value}"`}`}`;
}
function afterUpdate() {
}
var css$j = {
  code: "#svelte-announcer.svelte-1j55zn5{position:absolute;left:0;top:0;clip:rect(0 0 0 0);clip-path:inset(50%);overflow:hidden;white-space:nowrap;width:1px;height:1px}",
  map: `{"version":3,"file":"root.svelte","sources":["root.svelte"],"sourcesContent":["<!-- This file is generated by @sveltejs/kit \u2014 do not edit it! -->\\n<script>\\n\\timport { setContext, afterUpdate, onMount } from 'svelte';\\n\\n\\t// stores\\n\\texport let stores;\\n\\texport let page;\\n\\n\\texport let components;\\n\\texport let props_0 = null;\\n\\texport let props_1 = null;\\n\\texport let props_2 = null;\\n\\n\\tsetContext('__svelte__', stores);\\n\\n\\t$: stores.page.set(page);\\n\\tafterUpdate(stores.page.notify);\\n\\n\\tlet mounted = false;\\n\\tlet navigated = false;\\n\\tlet title = null;\\n\\n\\tonMount(() => {\\n\\t\\tconst unsubscribe = stores.page.subscribe(() => {\\n\\t\\t\\tif (mounted) {\\n\\t\\t\\t\\tnavigated = true;\\n\\t\\t\\t\\ttitle = document.title || 'untitled page';\\n\\t\\t\\t}\\n\\t\\t});\\n\\n\\t\\tmounted = true;\\n\\t\\treturn unsubscribe;\\n\\t});\\n<\/script>\\n\\n<svelte:component this={components[0]} {...(props_0 || {})}>\\n\\t{#if components[1]}\\n\\t\\t<svelte:component this={components[1]} {...(props_1 || {})}>\\n\\t\\t\\t{#if components[2]}\\n\\t\\t\\t\\t<svelte:component this={components[2]} {...(props_2 || {})}/>\\n\\t\\t\\t{/if}\\n\\t\\t</svelte:component>\\n\\t{/if}\\n</svelte:component>\\n\\n{#if mounted}\\n\\t<div id=\\"svelte-announcer\\" aria-live=\\"assertive\\" aria-atomic=\\"true\\">\\n\\t\\t{#if navigated}\\n\\t\\t\\t{title}\\n\\t\\t{/if}\\n\\t</div>\\n{/if}\\n\\n<style>\\n\\t#svelte-announcer {\\n\\t\\tposition: absolute;\\n\\t\\tleft: 0;\\n\\t\\ttop: 0;\\n\\t\\tclip: rect(0 0 0 0);\\n\\t\\tclip-path: inset(50%);\\n\\t\\toverflow: hidden;\\n\\t\\twhite-space: nowrap;\\n\\t\\twidth: 1px;\\n\\t\\theight: 1px;\\n\\t}\\n</style>"],"names":[],"mappings":"AAsDC,iBAAiB,eAAC,CAAC,AAClB,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,CAAC,CACP,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnB,SAAS,CAAE,MAAM,GAAG,CAAC,CACrB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,CACnB,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACZ,CAAC"}`
};
var Root = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { stores } = $$props;
  let { page: page2 } = $$props;
  let { components } = $$props;
  let { props_0 = null } = $$props;
  let { props_1 = null } = $$props;
  let { props_2 = null } = $$props;
  setContext("__svelte__", stores);
  afterUpdate(stores.page.notify);
  if ($$props.stores === void 0 && $$bindings.stores && stores !== void 0)
    $$bindings.stores(stores);
  if ($$props.page === void 0 && $$bindings.page && page2 !== void 0)
    $$bindings.page(page2);
  if ($$props.components === void 0 && $$bindings.components && components !== void 0)
    $$bindings.components(components);
  if ($$props.props_0 === void 0 && $$bindings.props_0 && props_0 !== void 0)
    $$bindings.props_0(props_0);
  if ($$props.props_1 === void 0 && $$bindings.props_1 && props_1 !== void 0)
    $$bindings.props_1(props_1);
  if ($$props.props_2 === void 0 && $$bindings.props_2 && props_2 !== void 0)
    $$bindings.props_2(props_2);
  $$result.css.add(css$j);
  {
    stores.page.set(page2);
  }
  return `


${validate_component(components[0] || missing_component, "svelte:component").$$render($$result, Object.assign(props_0 || {}), {}, {
    default: () => `${components[1] ? `${validate_component(components[1] || missing_component, "svelte:component").$$render($$result, Object.assign(props_1 || {}), {}, {
      default: () => `${components[2] ? `${validate_component(components[2] || missing_component, "svelte:component").$$render($$result, Object.assign(props_2 || {}), {}, {})}` : ``}`
    })}` : ``}`
  })}

${``}`;
});
var base$1 = "";
var assets = "";
function set_paths(paths) {
  base$1 = paths.base;
  assets = paths.assets || base$1;
}
function set_prerendering(value) {
}
var handle = async ({ request, resolve: resolve2 }) => {
  const cookies = import_cookie.default.parse(request.headers.cookie || "");
  request.locals.userid = cookies.userid || v4();
  if (request.query.has("_method")) {
    request.method = request.query.get("_method").toUpperCase();
  }
  const response = await resolve2(request);
  if (!cookies.userid) {
    response.headers["set-cookie"] = import_cookie.default.serialize("userid", request.locals.userid, {
      path: "/",
      httpOnly: true
    });
  }
  return response;
};
var user_hooks = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  handle
});
var template = ({ head, body }) => '<!DOCTYPE html>\n<html lang="en-AU">\n	<head>\n		<meta charset="utf-8" />\n		<meta http-equiv="X-UA-Compatible" content="IE=edge">\n\n		<meta name="viewport" content="width=device-width, initial-scale=1" />\n		<meta name="theme-color" content="#ff7964">\n		<link rel="shortcut icon" type="image/png" href="/favicon.ico">\n		<link rel="apple-touch-icon" href="/logo-192.png">\n\n		<link rel="preconnect" href="https://fonts.googleapis.com">\n		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n		<link href="https://fonts.googleapis.com/css2?family=Rubik:ital,wght@0,300;0,400;0,500;0,700;1,300;1,400&family=JetBrains+Mono&display=swap" rel="stylesheet">\n\n		<link rel="preconnect" href="https://kit.fontawesome.com">\n		<script src="https://kit.fontawesome.com/d7162ca60c.js" crossorigin="anonymous"><\/script>\n\n		' + head + '\n\n	</head>\n	<body>\n		<div id="svelte">' + body + "</div>\n	</body>\n</html>\n";
var options2 = null;
var default_settings = { paths: { "base": "", "assets": "" } };
function init(settings = default_settings) {
  set_paths(settings.paths);
  set_prerendering(settings.prerendering || false);
  const hooks = get_hooks(user_hooks);
  options2 = {
    amp: false,
    dev: false,
    entry: {
      file: assets + "/_app/start-0f5ccb43.js",
      css: [assets + "/_app/assets/start-61d1577b.css", assets + "/_app/assets/vendor-4ff902fe.css"],
      js: [assets + "/_app/start-0f5ccb43.js", assets + "/_app/chunks/vendor-b05f2678.js", assets + "/_app/chunks/singletons-12a22614.js"]
    },
    fetched: void 0,
    floc: false,
    get_component_path: (id) => assets + "/_app/" + entry_lookup[id],
    get_stack: (error2) => String(error2),
    handle_error: (error2, request) => {
      hooks.handleError({ error: error2, request });
      error2.stack = options2.get_stack(error2);
    },
    hooks,
    hydrate: true,
    initiator: void 0,
    load_component,
    manifest,
    paths: settings.paths,
    prerender: true,
    read: settings.read,
    root: Root,
    service_worker: null,
    router: true,
    ssr: false,
    target: "#svelte",
    template,
    trailing_slash: "never"
  };
}
var d = (s2) => s2.replace(/%23/g, "#").replace(/%3[Bb]/g, ";").replace(/%2[Cc]/g, ",").replace(/%2[Ff]/g, "/").replace(/%3[Ff]/g, "?").replace(/%3[Aa]/g, ":").replace(/%40/g, "@").replace(/%26/g, "&").replace(/%3[Dd]/g, "=").replace(/%2[Bb]/g, "+").replace(/%24/g, "$");
var empty = () => ({});
var manifest = {
  assets: [{ "file": "favicon.ico", "size": 15406, "type": "image/vnd.microsoft.icon" }, { "file": "favicon.png", "size": 1621, "type": "image/png" }, { "file": "icon-192.png", "size": 4815, "type": "image/png" }, { "file": "icon-512.png", "size": 19433, "type": "image/png" }, { "file": "logo--high-contrast.svg", "size": 3346, "type": "image/svg+xml" }, { "file": "logo--mono.svg", "size": 8294, "type": "image/svg+xml" }, { "file": "logo.svg", "size": 7571, "type": "image/svg+xml" }, { "file": "me.jpg", "size": 24549, "type": "image/jpeg" }, { "file": "robots.txt", "size": 67, "type": "text/plain" }],
  layout: "src/routes/__layout.svelte",
  error: ".svelte-kit/build/components/error.svelte",
  routes: [
    {
      type: "page",
      pattern: /^\/categories\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/categories.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/accounts\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/accounts/index.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/accounts\/([^/]+?)\/?$/,
      params: (m) => ({ id: d(m[1]) }),
      a: ["src/routes/__layout.svelte", "src/routes/accounts/[id].svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/debug\/Custom\/?$/,
      params: empty,
      a: ["src/routes/__layout.svelte", "src/routes/debug/Custom.svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    },
    {
      type: "page",
      pattern: /^\/debug\/([^/]+?)\/?$/,
      params: (m) => ({ type: d(m[1]) }),
      a: ["src/routes/__layout.svelte", "src/routes/debug/[type].svelte"],
      b: [".svelte-kit/build/components/error.svelte"]
    }
  ]
};
var get_hooks = (hooks) => ({
  getSession: hooks.getSession || (() => ({})),
  handle: hooks.handle || (({ request, resolve: resolve2 }) => resolve2(request)),
  handleError: hooks.handleError || (({ error: error2 }) => console.error(error2.stack)),
  externalFetch: hooks.externalFetch || fetch
});
var module_lookup = {
  "src/routes/__layout.svelte": () => Promise.resolve().then(function() {
    return __layout;
  }),
  ".svelte-kit/build/components/error.svelte": () => Promise.resolve().then(function() {
    return error;
  }),
  "src/routes/categories.svelte": () => Promise.resolve().then(function() {
    return categories;
  }),
  "src/routes/accounts/index.svelte": () => Promise.resolve().then(function() {
    return index;
  }),
  "src/routes/accounts/[id].svelte": () => Promise.resolve().then(function() {
    return _id_;
  }),
  "src/routes/debug/Custom.svelte": () => Promise.resolve().then(function() {
    return Custom$1;
  }),
  "src/routes/debug/[type].svelte": () => Promise.resolve().then(function() {
    return _type_;
  })
};
var metadata_lookup = { "src/routes/__layout.svelte": { "entry": "pages/__layout.svelte-b6df9671.js", "css": ["assets/pages/__layout.svelte-c0e7735b.css", "assets/vendor-4ff902fe.css"], "js": ["pages/__layout.svelte-b6df9671.js", "chunks/vendor-b05f2678.js", "chunks/navigation-51f4a605.js", "chunks/singletons-12a22614.js", "chunks/store-ba5005f5.js", "chunks/stores-4e4d7ca0.js"], "styles": [] }, ".svelte-kit/build/components/error.svelte": { "entry": "error.svelte-0c66ed44.js", "css": ["assets/vendor-4ff902fe.css"], "js": ["error.svelte-0c66ed44.js", "chunks/vendor-b05f2678.js"], "styles": [] }, "src/routes/categories.svelte": { "entry": "pages/categories.svelte-c1f1d67d.js", "css": ["assets/vendor-4ff902fe.css"], "js": ["pages/categories.svelte-c1f1d67d.js", "chunks/vendor-b05f2678.js"], "styles": [] }, "src/routes/accounts/index.svelte": { "entry": "pages/accounts/index.svelte-c8a25f23.js", "css": ["assets/vendor-4ff902fe.css"], "js": ["pages/accounts/index.svelte-c8a25f23.js", "chunks/vendor-b05f2678.js", "chunks/navigation-51f4a605.js", "chunks/singletons-12a22614.js", "chunks/store-ba5005f5.js"], "styles": [] }, "src/routes/accounts/[id].svelte": { "entry": "pages/accounts/[id].svelte-53641a3b.js", "css": ["assets/pages/accounts/[id].svelte-dbf907dc.css", "assets/vendor-4ff902fe.css", "assets/Debug-a7b1463b.css"], "js": ["pages/accounts/[id].svelte-53641a3b.js", "chunks/vendor-b05f2678.js", "chunks/stores-4e4d7ca0.js", "chunks/store-ba5005f5.js", "chunks/Debug-31e5f0a3.js"], "styles": [] }, "src/routes/debug/Custom.svelte": { "entry": "pages/debug/Custom.svelte-76bea268.js", "css": ["assets/pages/debug/Custom.svelte-28935975.css", "assets/vendor-4ff902fe.css", "assets/Debug-a7b1463b.css"], "js": ["pages/debug/Custom.svelte-76bea268.js", "chunks/vendor-b05f2678.js", "chunks/store-ba5005f5.js", "chunks/Debug-31e5f0a3.js"], "styles": [] }, "src/routes/debug/[type].svelte": { "entry": "pages/debug/[type].svelte-f85d7d07.js", "css": ["assets/pages/debug/[type].svelte-e36bf6f0.css", "assets/vendor-4ff902fe.css", "assets/Debug-a7b1463b.css"], "js": ["pages/debug/[type].svelte-f85d7d07.js", "chunks/vendor-b05f2678.js", "chunks/stores-4e4d7ca0.js", "chunks/store-ba5005f5.js", "chunks/Debug-31e5f0a3.js"], "styles": [] } };
async function load_component(file) {
  const { entry, css: css2, js, styles } = metadata_lookup[file];
  return {
    module: await module_lookup[file](),
    entry: assets + "/_app/" + entry,
    css: css2.map((dep) => assets + "/_app/" + dep),
    js: js.map((dep) => assets + "/_app/" + dep),
    styles
  };
}
function render(request, {
  prerender
} = {}) {
  const host = request.headers["host"];
  return respond({ ...request, host }, options2, { prerender });
}
var subscriber_queue = [];
function readable(value, start) {
  return {
    subscribe: writable(value, start).subscribe
  };
}
function writable(value, start = noop) {
  let stop;
  const subscribers = new Set();
  function set(new_value) {
    if (safe_not_equal(value, new_value)) {
      value = new_value;
      if (stop) {
        const run_queue = !subscriber_queue.length;
        for (const subscriber of subscribers) {
          subscriber[1]();
          subscriber_queue.push(subscriber, value);
        }
        if (run_queue) {
          for (let i = 0; i < subscriber_queue.length; i += 2) {
            subscriber_queue[i][0](subscriber_queue[i + 1]);
          }
          subscriber_queue.length = 0;
        }
      }
    }
  }
  function update(fn) {
    set(fn(value));
  }
  function subscribe2(run2, invalidate = noop) {
    const subscriber = [run2, invalidate];
    subscribers.add(subscriber);
    if (subscribers.size === 1) {
      stop = start(set) || noop;
    }
    run2(value);
    return () => {
      subscribers.delete(subscriber);
      if (subscribers.size === 0) {
        stop();
        stop = null;
      }
    };
  }
  return { set, update, subscribe: subscribe2 };
}
function derived(stores, fn, initial_value) {
  const single = !Array.isArray(stores);
  const stores_array = single ? [stores] : stores;
  const auto = fn.length < 2;
  return readable(initial_value, (set) => {
    let inited = false;
    const values = [];
    let pending = 0;
    let cleanup = noop;
    const sync = () => {
      if (pending) {
        return;
      }
      cleanup();
      const result = fn(single ? values[0] : values, set);
      if (auto) {
        set(result);
      } else {
        cleanup = is_function(result) ? result : noop;
      }
    };
    const unsubscribers = stores_array.map((store, i) => subscribe(store, (value) => {
      values[i] = value;
      pending &= ~(1 << i);
      if (inited) {
        sync();
      }
    }, () => {
      pending |= 1 << i;
    }));
    inited = true;
    sync();
    return function stop() {
      run_all(unsubscribers);
      cleanup();
    };
  });
}
var format2 = {
  date: (date, format22) => new Date(date).toLocaleDateString("en-AU", format22 || { weekday: "long", day: "numeric", "month": "long", year: "numeric" }),
  time: (date) => new Date(date).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" }),
  currency: (num) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(num).replace("$", "")
};
var log = (...args) => get_store_value(u) && get_store_value(u)["debug"] && console.log(...args);
var get_category = (id) => {
  let cats = get_store_value(categories$1);
  let index2 = cats.findIndex((cat) => cat.id === id);
  if (index2 > -1)
    return cats[index2];
};
var limiter = new import_bottleneck.default({ minTime: 101 });
var api = {
  ping: (token2) => limiter.schedule(() => call("{base}/util/ping", "GET", {}, token2)),
  get: (type, params = {}) => limiter.schedule(() => call(`{base}/${type}`, "GET", params)),
  get_txns_for_acct: (account, params) => limiter.schedule(() => call(`{base}/accounts/${account}/transactions`, "GET", Object.assign({
    "page[size]": 50
  }, params))),
  get_custom: (path, params = {}) => limiter.schedule(() => call(path, "GET", params)),
  tags: {
    add: (tx_id, tag_id) => limiter.schedule(() => call(`{base}/transactions/${tx_id}/relationships/tags`, "POST", {
      data: [{
        type: "tags",
        id: tag_id
      }]
    })),
    remove: (tx_id, tag_id) => limiter.schedule(() => call(`{base}/transactions/${tx_id}/relationships/tags`, "DELETE", {
      data: [{
        type: "tags",
        id: tag_id
      }]
    }))
  }
};
var call = (path, method, params, user_token = get_store_value(token)) => {
  log("Initiating call", path, params);
  let query_url = new URL(path.replace("{base}", "https://api.up.com.au/api/v1"));
  let opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": `Bearer ${user_token}`
    }
  };
  if (Object.keys(params).length) {
    log("Sorting params", params);
    switch (method) {
      case "GET":
        Object.keys(params).forEach((key) => params[key] && query_url.searchParams.append(key, params[key]));
        break;
      case "PUT":
      case "POST":
        opts.body = JSON.stringify(params);
        break;
      case "DELETE":
        opts.body = JSON.stringify(params);
        break;
    }
  }
  return new Promise((resolve2, reject) => {
    fetch(query_url, opts).then((result) => {
      log("Result", result);
      if (result.status === 401) {
        reject("Not authorised", result.json());
      } else if (result.status === 404) {
        reject("404 error", result.json());
      } else if (result.status === 429) {
        reject("API rate limit reached", result.json());
      } else if (method === "DELETE" || method === "POST" && result.ok) {
        resolve2(result);
      } else if (method === "GET" && result.ok) {
        resolve2(result && result.json());
      } else {
        reject(Error(result, path, method, params));
      }
    }, (err) => {
      reject(Error(err, path, method, params));
    });
  });
};
var store_get = (store, key) => {
  if (typeof window !== "undefined") {
    return window[store].getItem(key);
  }
};
var store_set = (store, key, value) => {
  if (typeof window !== "undefined") {
    window[store].setItem(key, value);
  }
};
var stored_users = store_get("localStorage", "users");
var users = writable(stored_users && JSON.parse(stored_users) || {});
users.subscribe((value) => store_set("localStorage", "users", JSON.stringify(value)));
var stored_userid = store_get("sessionStorage", "userid");
var userid = writable(stored_userid && JSON.parse(stored_userid) || {});
userid.subscribe((value) => store_set("sessionStorage", "userid", JSON.stringify(value)));
var stored_token = store_get("sessionStorage", "token");
var token = writable(stored_token && JSON.parse(stored_token) || {});
token.subscribe((value) => store_set("sessionStorage", "token", JSON.stringify(value)));
var u = derived([users, userid], ([$users, $userid], set) => {
  set($users[$userid]);
});
var stored_status = store_get("sessionStorage", "logged_in");
var logged_in = writable(stored_status && JSON.parse(stored_status) || false);
logged_in.subscribe((value) => store_set("sessionStorage", "logged_in", JSON.stringify(value)));
var stored_accounts = store_get("sessionStorage", "accounts");
var accounts = writable(stored_accounts && JSON.parse(stored_accounts) || []);
accounts.subscribe((value) => store_set("sessionStorage", "accounts", JSON.stringify(value)));
var stored_categories = store_get("sessionStorage", "categories");
var categories$1 = writable(stored_categories && JSON.parse(stored_categories) || []);
categories$1.subscribe((value) => store_set("sessionStorage", "categories", JSON.stringify(value)));
var stored_tags = store_get("sessionStorage", "tags");
var tags = writable(stored_tags && JSON.parse(stored_tags) || []);
tags.subscribe((value) => store_set("sessionStorage", "tags", JSON.stringify(value)));
var txcache = writable({});
var getStores = () => {
  const stores = getContext("__svelte__");
  return {
    page: {
      subscribe: stores.page.subscribe
    },
    navigating: {
      subscribe: stores.navigating.subscribe
    },
    get preloading() {
      console.error("stores.preloading is deprecated; use stores.navigating instead");
      return {
        subscribe: stores.navigating.subscribe
      };
    },
    session: stores.session
  };
};
var page = {
  subscribe(fn) {
    const store = getStores().page;
    return store.subscribe(fn);
  }
};
var css$i = {
  code: "nav.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{height:var(--header-height);margin:var(--gap);border-radius:var(--gbr);background:rgb(var(--c-brand));display:flex;flex-flow:row nowrap;justify-content:space-between;position:relative;box-shadow:0 4px 8px rgba(var(--c-background-darker), .45), 0 -3px 0 rgba(0, 0, 0, .15) inset}body.high-contrast nav{background:rgb(var(--c-background)) !important;box-shadow:0 0 0 1px rgb(var(--c-brand)) inset !important}nav.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj::before,nav.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj::after{content:'';position:absolute;top:calc(var(--gap) * -1);right:calc(var(--gap) * -1);left:calc(var(--gap) * -1);height:calc(100% + 16px)}nav.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj::before{background:rgba(var(--c-background-darker), 0);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);z-index:-2}nav.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj::after{background:linear-gradient(to bottom,rgba(var(--c-background-darker), .45), rgba(var(--c-background-darker), 1));z-index:-1}menu.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{list-style:none;margin:0;padding:0}.accounts.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{display:flex;flex-flow:row nowrap;flex:1}.accounts.svelte-19tp0pj li.svelte-19tp0pj.svelte-19tp0pj{display:flex;flex-flow:column;justify-content:center;flex:0 0 auto;margin:0 calc(var(--gap) / 2)}@media screen and (max-width: 1280px){.accounts.svelte-19tp0pj li.svelte-19tp0pj.svelte-19tp0pj{margin:0}}.accounts.svelte-19tp0pj a.svelte-19tp0pj.svelte-19tp0pj{flex:1;position:relative;display:flex;flex-flow:column;justify-content:center;font-size:var(--font-small);font-weight:bold;text-transform:uppercase;padding:0 calc(var(--gap) / 2) 3px;text-shadow:0 1px 2px rgba(0, 0, 0, .45)}.accounts.svelte-19tp0pj a.svelte-19tp0pj.svelte-19tp0pj:hover::after,.accounts.svelte-19tp0pj li[aria-current=page] a.svelte-19tp0pj.svelte-19tp0pj::after{content:'';position:absolute;bottom:0;left:0;right:0;height:3px;background:rgb(var(--c-accent-blue));box-shadow:0 0 8px rgba(var(--c-accent-blue), 1)}.accounts.svelte-19tp0pj li.svelte-19tp0pj:not([aria-current=page]) a.svelte-19tp0pj:hover::after{opacity:.75;box-shadow:none}.logo.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{width:calc(var(--gap) * 6);min-width:60px;margin-top:-6%;margin-left:var(--gap)}a.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{text-decoration:none;color:inherit}.menu-button.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{margin:0;display:flex;flex-flow:row nowrap;justify-content:flex-start;align-items:center;text-align:left;padding:0 var(--gap);color:rgba(var(--c-white), .65);cursor:pointer;background:none;border:none}.menu-button.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj:hover{color:rgba(var(--c-white), 1)}.menu-button.svelte-19tp0pj span.svelte-19tp0pj.svelte-19tp0pj{position:absolute;opacity:0}.menu-button[data-open=true].svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{background:rgb(var(--c-white));color:rgb(var(--c-brand));border-color:rgb(var(--c-white));border-radius:var(--gbr) var(--gbr) 0 0}.options.svelte-19tp0pj.svelte-19tp0pj.svelte-19tp0pj{position:relative;display:flex;flex-flow:column;justify-content:center}.options.svelte-19tp0pj .menu-button.svelte-19tp0pj.svelte-19tp0pj{flex:1;z-index:1;padding-bottom:3px}.options.svelte-19tp0pj menu.svelte-19tp0pj.svelte-19tp0pj{position:absolute;background:rgb(var(--c-white));top:100%;right:0;width:240px;border-radius:var(--gbr) 0 var(--gbr) var(--gbr);color:rgb(var(--c-background));padding:calc(var(--gap)/8);box-shadow:0 4px 8px rgba(var(--c-background), .65)}.options.svelte-19tp0pj li.divider.svelte-19tp0pj.svelte-19tp0pj{height:1px;background:rgba(var(--c-border), .15);margin:calc(var(--gap) / 4)}.options.svelte-19tp0pj menu.svelte-19tp0pj a.svelte-19tp0pj{padding:calc(var(--gap) / 2) calc(var(--gap) / 1);display:flex;flex-flow:row nowrap;align-items:center;border-radius:calc(var(--gbr) / 2);font-size:14px;font-weight:500}.options.svelte-19tp0pj menu a span.svelte-19tp0pj.svelte-19tp0pj{flex:1;margin-left:calc(var(--gap) / 2)}.options.svelte-19tp0pj menu.svelte-19tp0pj a.svelte-19tp0pj:hover{background:rgb(var(--c-brand));color:rgb(var(--c-white));text-shadow:0 1px 2px rgba(0, 0, 0, .45)}",
  map: `{"version":3,"file":"Nav.svelte","sources":["Nav.svelte"],"sourcesContent":["<script>\\n  import { page } from '$app/stores';\\n  import { u, accounts } from '$lib/store.js';\\n  import { toggle_user_pref, logout } from '$lib/app';\\n\\n  let show_menu;\\n\\n  const debug_types = ['Accounts', 'Categories', 'Tags', 'Transactions', 'Custom'];\\n\\n<\/script>\\n\\n<style>\\n\\n  nav {\\n    height: var(--header-height);\\n    margin: var(--gap);\\n    border-radius: var(--gbr);\\n    background: rgb(var(--c-brand));\\n    display: flex;\\n    flex-flow: row nowrap;\\n    justify-content: space-between;\\n    position: relative;\\n    box-shadow: 0 4px 8px rgba(var(--c-background-darker), .45), 0 -3px 0 rgba(0, 0, 0, .15) inset;\\n  }\\n  :global(body.high-contrast nav) {\\n    background: rgb(var(--c-background)) !important;\\n    box-shadow: 0 0 0 1px rgb(var(--c-brand)) inset !important;\\n  }\\n  nav::before, nav::after {\\n    content: '';\\n    position: absolute;\\n    top: calc(var(--gap) * -1);\\n    right: calc(var(--gap) * -1);\\n    left: calc(var(--gap) * -1);\\n    height: calc(100% + 16px);\\n\\n  }\\n  nav::before {\\n    background: rgba(var(--c-background-darker), 0);\\n    -webkit-backdrop-filter: blur(12px);\\n    backdrop-filter: blur(12px);\\n    z-index: -2;\\n  }\\n  nav::after {\\n    background: linear-gradient(to bottom,rgba(var(--c-background-darker), .45), rgba(var(--c-background-darker), 1));\\n    z-index: -1;\\n  }\\n\\n  menu {\\n    list-style: none;\\n    margin: 0;\\n    padding: 0;\\n  }\\n\\n  .accounts {\\n    display: flex;\\n    flex-flow: row nowrap;\\n    flex: 1;\\n  }\\n\\n  .accounts li {\\n    display: flex;\\n    flex-flow: column;\\n    justify-content: center;\\n    flex: 0 0 auto;\\n    margin: 0 calc(var(--gap) / 2);\\n  }\\n  @media screen and (max-width: 1280px) {\\n    .accounts li {\\n      margin: 0;\\n    }\\n  }\\n  .accounts a {\\n    flex: 1;\\n    position: relative;\\n    display: flex;\\n    flex-flow: column;\\n    justify-content: center;\\n\\n    font-size: var(--font-small);\\n    font-weight: bold;\\n    text-transform: uppercase;\\n    padding: 0 calc(var(--gap) / 2) 3px;\\n    text-shadow: 0 1px 2px rgba(0, 0, 0, .45);\\n  }\\n  .accounts a:hover::after, .accounts li[aria-current=page] a::after {\\n    content: '';\\n    position: absolute;\\n    bottom: 0;\\n    left: 0;\\n    right: 0;\\n    height: 3px;\\n    background: rgb(var(--c-accent-blue));\\n    box-shadow: 0 0 8px rgba(var(--c-accent-blue), 1);\\n  }\\n  .accounts li:not([aria-current=page]) a:hover::after {\\n    opacity: .75;\\n    box-shadow: none;\\n  }\\n\\n\\n  .logo {\\n    width: calc(var(--gap) * 6);\\n    min-width: 60px;\\n    margin-top: -6%;\\n    margin-left: var(--gap);\\n  }\\n\\n  a {\\n    text-decoration: none;\\n    color: inherit;\\n  }\\n\\n  .menu-button {\\n    margin: 0;\\n    display: flex;\\n    flex-flow: row nowrap;\\n    justify-content: flex-start;\\n    align-items: center;\\n    text-align: left;\\n    padding: 0 var(--gap);\\n    color: rgba(var(--c-white), .65);\\n    cursor: pointer;\\n    background: none;\\n    border: none;\\n  }\\n\\n  .menu-button:hover {\\n    color: rgba(var(--c-white), 1);\\n  }\\n\\n  .menu-button span {\\n    position: absolute;\\n    opacity: 0;\\n  }\\n\\n  .menu-button[data-open=true] {\\n    background: rgb(var(--c-white));\\n    color: rgb(var(--c-brand));\\n    border-color: rgb(var(--c-white));\\n    border-radius: var(--gbr) var(--gbr) 0 0;\\n  }\\n  .options {\\n    position: relative;\\n    display: flex;\\n    flex-flow: column;\\n    justify-content: center;\\n  }\\n  .options .menu-button {\\n    flex: 1;\\n    z-index: 1;\\n    padding-bottom: 3px;\\n  }\\n  .options menu {\\n    position: absolute;\\n    background: rgb(var(--c-white));\\n    top: 100%;\\n    right: 0;\\n    width: 240px;\\n    border-radius: var(--gbr) 0 var(--gbr) var(--gbr);\\n    color: rgb(var(--c-background));\\n    padding: calc(var(--gap)/8);\\n    box-shadow: 0 4px 8px rgba(var(--c-background), .65);\\n  }\\n  .options li.divider {\\n    height: 1px;\\n    background: rgba(var(--c-border), .15);\\n    margin: calc(var(--gap) / 4);\\n  }\\n  .options menu a {\\n    padding: calc(var(--gap) / 2) calc(var(--gap) / 1);\\n    display: flex;\\n    flex-flow: row nowrap;\\n    align-items: center;\\n    border-radius: calc(var(--gbr) / 2);\\n    font-size: 14px;\\n    font-weight: 500;\\n  }\\n  .options menu a span {\\n    flex: 1;\\n    margin-left: calc(var(--gap) / 2);\\n  }\\n  .options menu a:hover {\\n    background: rgb(var(--c-brand));\\n    color: rgb(var(--c-white));\\n    text-shadow: 0 1px 2px rgba(0, 0, 0, .45);\\n  }\\n</style>\\n\\n<nav>\\n  <h1>\\n    {#if $u.contrast}\\n    <img class=\\"logo\\" src=\\"/logo--high-contrast.svg\\" alt=\\"UPify\\">\\n    {:else}\\n    <img class=\\"logo\\" src=\\"/logo.svg\\" alt=\\"UPify\\">\\n    {/if}\\n  </h1>\\n\\n  <menu class=\\"accounts\\">\\n    {#each $accounts as a}<li aria-current={ a.id === $page.params.id ? 'page' : undefined }>\\n      <a href=\\"/accounts/{a.id}\\">{a.attributes.displayName}</a>\\n    </li>{/each}\\n  </menu>\\n\\n  {#if $u.debug}<aside class=\\"options\\">\\n    <button class=\\"menu-button\\" on:click={() => show_menu = show_menu === 'debug' ? null : 'debug'} data-open={show_menu === 'debug'}>\\n      <i class=\\"fas fa-bug\\"></i>\\n      <span>Debug options</span>\\n    </button>\\n\\n    {#if show_menu === 'debug'}<menu>{#each debug_types as d}\\n      <li><a href=\\"/debug/{d}\\" on:click={() => show_menu = null}>{d}</a></li>\\n    {/each}</menu>{/if}\\n  </aside>{/if}\\n\\n  <aside class=\\"options\\">\\n    <button class=\\"menu-button\\" on:click={() => show_menu = show_menu === 'options' ? null : 'options'} data-open={show_menu === 'options'}>\\n      <i class=\\"fas fa-bars\\"></i>\\n      <span>Menu</span>\\n    </button>\\n    {#if show_menu === 'options'}\\n    <menu>\\n      <li><a href=\\"/help\\" on:click={() => show_menu = false}>\\n        <i class=\\"fas fa-life-ring\\"></i>\\n        <span>Help</span>\\n      </a></li>\\n      <li><a href=\\"/privacy\\">\\n        <i class=\\"fas fa-lock\\"></i>\\n        <span>Privacy</span>\\n      </a></li>\\n      <li><a href=\\"https://ko-fi.com/ohnojono\\" target=\\"_blank\\">\\n        <i class=\\"fas fa-heart\\"></i>\\n        <span>Support UPify</span>\\n        <i class=\\"fas fa-external-link-alt\\"></i>\\n      </a></li>\\n\\n      <li class=\\"divider\\">&nbsp;</li>\\n\\n      <li><a href=\\"/contrast\\" on:click|preventDefault={() => toggle_user_pref( 'contrast', true )}>\\n        <i class=\\"fas fa-adjust\\"></i>\\n        <span>High contrast mode</span>\\n        {#if $u.contrast}\\n        <i class=\\"fas fa-toggle-on\\"></i>\\n        {:else}\\n        <i class=\\"fas fa-toggle-off\\"></i>\\n        {/if}\\n      </a></li>\\n\\n      <li class=\\"divider\\">&nbsp;</li>\\n\\n      <li><a href=\\"/debug\\" on:click|preventDefault={() => toggle_user_pref( 'debug', true )}>\\n        <i class=\\"fas fa-bug\\"></i>\\n        <span>Debug mode</span>\\n        {#if $u.debug}\\n        <i class=\\"fas fa-toggle-on\\"></i>\\n        {:else}\\n        <i class=\\"fas fa-toggle-off\\"></i>\\n        {/if}\\n      </a></li>\\n\\n      <li class=\\"divider\\">&nbsp;</li>\\n\\n      <li><a href=\\"/logout\\" on:click|preventDefault={logout}>\\n        <i class=\\"fas fa-sign-out-alt\\"></i>\\n        <span>Log out</span>\\n      </a></li>\\n    </menu>\\n    {/if}\\n  </aside>\\n\\n</nav>\\n"],"names":[],"mappings":"AAaE,GAAG,6CAAC,CAAC,AACH,MAAM,CAAE,IAAI,eAAe,CAAC,CAC5B,MAAM,CAAE,IAAI,KAAK,CAAC,CAClB,aAAa,CAAE,IAAI,KAAK,CAAC,CACzB,UAAU,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC/B,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CACrB,eAAe,CAAE,aAAa,CAC9B,QAAQ,CAAE,QAAQ,CAClB,UAAU,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,IAAI,qBAAqB,CAAC,CAAC,CAAC,GAAG,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,CAAC,KAAK,AAChG,CAAC,AACO,sBAAsB,AAAE,CAAC,AAC/B,UAAU,CAAE,IAAI,IAAI,cAAc,CAAC,CAAC,CAAC,UAAU,CAC/C,UAAU,CAAE,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,IAAI,IAAI,SAAS,CAAC,CAAC,CAAC,KAAK,CAAC,UAAU,AAC5D,CAAC,AACD,gDAAG,QAAQ,CAAE,gDAAG,OAAO,AAAC,CAAC,AACvB,OAAO,CAAE,EAAE,CACX,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAC1B,KAAK,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAC5B,IAAI,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAC3B,MAAM,CAAE,KAAK,IAAI,CAAC,CAAC,CAAC,IAAI,CAAC,AAE3B,CAAC,AACD,gDAAG,QAAQ,AAAC,CAAC,AACX,UAAU,CAAE,KAAK,IAAI,qBAAqB,CAAC,CAAC,CAAC,CAAC,CAAC,CAC/C,uBAAuB,CAAE,KAAK,IAAI,CAAC,CACnC,eAAe,CAAE,KAAK,IAAI,CAAC,CAC3B,OAAO,CAAE,EAAE,AACb,CAAC,AACD,gDAAG,OAAO,AAAC,CAAC,AACV,UAAU,CAAE,gBAAgB,EAAE,CAAC,MAAM,CAAC,KAAK,IAAI,qBAAqB,CAAC,CAAC,CAAC,GAAG,CAAC,CAAC,CAAC,KAAK,IAAI,qBAAqB,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACjH,OAAO,CAAE,EAAE,AACb,CAAC,AAED,IAAI,6CAAC,CAAC,AACJ,UAAU,CAAE,IAAI,CAChB,MAAM,CAAE,CAAC,CACT,OAAO,CAAE,CAAC,AACZ,CAAC,AAED,SAAS,6CAAC,CAAC,AACT,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CACrB,IAAI,CAAE,CAAC,AACT,CAAC,AAED,wBAAS,CAAC,EAAE,8BAAC,CAAC,AACZ,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,MAAM,CACjB,eAAe,CAAE,MAAM,CACvB,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,CACd,MAAM,CAAE,CAAC,CAAC,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,AAChC,CAAC,AACD,OAAO,MAAM,CAAC,GAAG,CAAC,YAAY,MAAM,CAAC,AAAC,CAAC,AACrC,wBAAS,CAAC,EAAE,8BAAC,CAAC,AACZ,MAAM,CAAE,CAAC,AACX,CAAC,AACH,CAAC,AACD,wBAAS,CAAC,CAAC,8BAAC,CAAC,AACX,IAAI,CAAE,CAAC,CACP,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,MAAM,CACjB,eAAe,CAAE,MAAM,CAEvB,SAAS,CAAE,IAAI,YAAY,CAAC,CAC5B,WAAW,CAAE,IAAI,CACjB,cAAc,CAAE,SAAS,CACzB,OAAO,CAAE,CAAC,CAAC,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CACnC,WAAW,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAC3C,CAAC,AACD,wBAAS,CAAC,+BAAC,MAAM,OAAO,CAAE,wBAAS,CAAC,EAAE,CAAC,YAAY,CAAC,IAAI,CAAC,CAAC,+BAAC,OAAO,AAAC,CAAC,AAClE,OAAO,CAAE,EAAE,CACX,QAAQ,CAAE,QAAQ,CAClB,MAAM,CAAE,CAAC,CACT,IAAI,CAAE,CAAC,CACP,KAAK,CAAE,CAAC,CACR,MAAM,CAAE,GAAG,CACX,UAAU,CAAE,IAAI,IAAI,eAAe,CAAC,CAAC,CACrC,UAAU,CAAE,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,KAAK,IAAI,eAAe,CAAC,CAAC,CAAC,CAAC,CAAC,AACnD,CAAC,AACD,wBAAS,CAAC,iBAAE,KAAK,CAAC,YAAY,CAAC,IAAI,CAAC,CAAC,CAAC,gBAAC,MAAM,OAAO,AAAC,CAAC,AACpD,OAAO,CAAE,GAAG,CACZ,UAAU,CAAE,IAAI,AAClB,CAAC,AAGD,KAAK,6CAAC,CAAC,AACL,KAAK,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAC3B,SAAS,CAAE,IAAI,CACf,UAAU,CAAE,GAAG,CACf,WAAW,CAAE,IAAI,KAAK,CAAC,AACzB,CAAC,AAED,CAAC,6CAAC,CAAC,AACD,eAAe,CAAE,IAAI,CACrB,KAAK,CAAE,OAAO,AAChB,CAAC,AAED,YAAY,6CAAC,CAAC,AACZ,MAAM,CAAE,CAAC,CACT,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CACrB,eAAe,CAAE,UAAU,CAC3B,WAAW,CAAE,MAAM,CACnB,UAAU,CAAE,IAAI,CAChB,OAAO,CAAE,CAAC,CAAC,IAAI,KAAK,CAAC,CACrB,KAAK,CAAE,KAAK,IAAI,SAAS,CAAC,CAAC,CAAC,GAAG,CAAC,CAChC,MAAM,CAAE,OAAO,CACf,UAAU,CAAE,IAAI,CAChB,MAAM,CAAE,IAAI,AACd,CAAC,AAED,yDAAY,MAAM,AAAC,CAAC,AAClB,KAAK,CAAE,KAAK,IAAI,SAAS,CAAC,CAAC,CAAC,CAAC,CAAC,AAChC,CAAC,AAED,2BAAY,CAAC,IAAI,8BAAC,CAAC,AACjB,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,CAAC,AACZ,CAAC,AAED,YAAY,CAAC,SAAS,CAAC,IAAI,CAAC,6CAAC,CAAC,AAC5B,UAAU,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC/B,KAAK,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC1B,YAAY,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CACjC,aAAa,CAAE,IAAI,KAAK,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,AAC1C,CAAC,AACD,QAAQ,6CAAC,CAAC,AACR,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,MAAM,CACjB,eAAe,CAAE,MAAM,AACzB,CAAC,AACD,uBAAQ,CAAC,YAAY,8BAAC,CAAC,AACrB,IAAI,CAAE,CAAC,CACP,OAAO,CAAE,CAAC,CACV,cAAc,CAAE,GAAG,AACrB,CAAC,AACD,uBAAQ,CAAC,IAAI,8BAAC,CAAC,AACb,QAAQ,CAAE,QAAQ,CAClB,UAAU,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC/B,GAAG,CAAE,IAAI,CACT,KAAK,CAAE,CAAC,CACR,KAAK,CAAE,KAAK,CACZ,aAAa,CAAE,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,IAAI,KAAK,CAAC,CACjD,KAAK,CAAE,IAAI,IAAI,cAAc,CAAC,CAAC,CAC/B,OAAO,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAC3B,UAAU,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,IAAI,cAAc,CAAC,CAAC,CAAC,GAAG,CAAC,AACtD,CAAC,AACD,uBAAQ,CAAC,EAAE,QAAQ,8BAAC,CAAC,AACnB,MAAM,CAAE,GAAG,CACX,UAAU,CAAE,KAAK,IAAI,UAAU,CAAC,CAAC,CAAC,GAAG,CAAC,CACtC,MAAM,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,AAC9B,CAAC,AACD,uBAAQ,CAAC,mBAAI,CAAC,CAAC,eAAC,CAAC,AACf,OAAO,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAClD,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CACrB,WAAW,CAAE,MAAM,CACnB,aAAa,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnC,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,GAAG,AAClB,CAAC,AACD,uBAAQ,CAAC,IAAI,CAAC,CAAC,CAAC,IAAI,8BAAC,CAAC,AACpB,IAAI,CAAE,CAAC,CACP,WAAW,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,AACnC,CAAC,AACD,uBAAQ,CAAC,mBAAI,CAAC,gBAAC,MAAM,AAAC,CAAC,AACrB,UAAU,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC/B,KAAK,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC1B,WAAW,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAC3C,CAAC"}`
};
var Nav = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $u, $$unsubscribe_u;
  let $accounts, $$unsubscribe_accounts;
  let $page, $$unsubscribe_page;
  $$unsubscribe_u = subscribe(u, (value) => $u = value);
  $$unsubscribe_accounts = subscribe(accounts, (value) => $accounts = value);
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let show_menu;
  $$result.css.add(css$i);
  $$unsubscribe_u();
  $$unsubscribe_accounts();
  $$unsubscribe_page();
  return `<nav class="${"svelte-19tp0pj"}"><h1>${$u.contrast ? `<img class="${"logo svelte-19tp0pj"}" src="${"/logo--high-contrast.svg"}" alt="${"UPify"}">` : `<img class="${"logo svelte-19tp0pj"}" src="${"/logo.svg"}" alt="${"UPify"}">`}</h1>

  <menu class="${"accounts svelte-19tp0pj"}">${each($accounts, (a) => `<li${add_attribute("aria-current", a.id === $page.params.id ? "page" : void 0, 0)} class="${"svelte-19tp0pj"}"><a href="${"/accounts/" + escape2(a.id)}" class="${"svelte-19tp0pj"}">${escape2(a.attributes.displayName)}</a>
    </li>`)}</menu>

  ${$u.debug ? `<aside class="${"options svelte-19tp0pj"}"><button class="${"menu-button svelte-19tp0pj"}"${add_attribute("data-open", show_menu === "debug", 0)}><i class="${"fas fa-bug"}"></i>
      <span class="${"svelte-19tp0pj"}">Debug options</span></button>

    ${``}</aside>` : ``}

  <aside class="${"options svelte-19tp0pj"}"><button class="${"menu-button svelte-19tp0pj"}"${add_attribute("data-open", show_menu === "options", 0)}><i class="${"fas fa-bars"}"></i>
      <span class="${"svelte-19tp0pj"}">Menu</span></button>
    ${``}</aside></nav>`;
});
var css$h = {
  code: "details.svelte-1wcea2m+details.svelte-1wcea2m{margin-top:32px}summary.svelte-1wcea2m.svelte-1wcea2m{display:flex;flex-flow:row nowrap;align-items:center;list-style:none;position:relative;cursor:pointer}summary.svelte-1wcea2m.svelte-1wcea2m::-webkit-details-marker{display:none}summary.svelte-1wcea2m.svelte-1wcea2m::before{content:'';position:absolute;top:50%;left:-32px;width:14px;height:14px;border:4px solid rgb(var(--text));border-width:0 4px 4px 0;transform:translateY(-80%) rotate(45deg)}summary.svelte-1wcea2m.svelte-1wcea2m:focus{outline:none}details[open].svelte-1wcea2m summary.svelte-1wcea2m::before{transform:translateY(-40%) rotate(225deg)}h2.svelte-1wcea2m.svelte-1wcea2m{margin:0;color:rgb(var(--text))}.portrait{--size:calc(var(--gap) * 8 );width:var(--size);height:var(--size);background:rgb(var(--c-accent)) url('/me.jpg') no-repeat center / cover;background-blend-mode:multiply;float:left;margin:1em 1em 0 0}",
  map: `{"version":3,"file":"FAQ.svelte","sources":["FAQ.svelte"],"sourcesContent":["<script context=\\"module\\">\\n  const faq = [\\n    {\\n      id: 'how',\\n      open: true,\\n      title: 'How does this work?',\\n      content: \`<p>UPify is a web app that lives entirely in your web browser and uses UP\u2019s API to access your account information. All communication with UP happens between your web browser and their servers. None of your information is transmitted to or stored on UPify\u2019s web server in any way.</p>\\n\\n      <p>UPify is open-source, so if you\u2019re that way inclined feel free to <a href=\\"https://github.com/jono-hayward/dd-upify\\" target=\\"_blank\\">check out the source code on GitHub</a>.</p>\`\\n    },\\n    {\\n      id: 'who',\\n      title: 'Who made this? And why?',\\n      content: \`<figure class=\\"portrait\\"></figure>\\n\\n      <p>Hey! I'm <a href=\\"https://twitter.com/jono_hayward\\" target=\\"_blank\\">Jono Hayward</a> and I made UPify. I\u2019m not affiliated with UP in any way beyond being a customer myself.</p>\\n\\n      <p>Up is easily the best banking experience on a mobile device. But while they're focusing on mobile, I'm a big spreadsheet nerd and was missing the ability to track all my transactions on the big screen. I built UPify to let me satisfy this compulsion.</p>\\n\\n      <p>I made UPify in my spare time. If you like what I\u2019ve done here, feel free to <a href=\\"https://ko-fi.com/ohnojono\\" target=\\"_blank\\">buy me a coffee</a>.</p>\`\\n    },\\n    {\\n      id: 'safety',\\n      title: 'How safe is my info?',\\n      content: \`<p>In a word: <em>very.</em></p>\\n\\n      <p>All of UPify's functionality uses the <a href=\\"https://developer.up.com.au/\\" target=\\"_blank\\">secure API provided by UP</a>. And they're pretty good at that stuff. All information is sent over a secure, encrypted connection, so it's just as safe as using the UP app on your phone.</p>\\n\\n      <p>The only bit of personal information UPify keeps about you is your personal access token, so you can log in quickly without having to remember 136 characters of gibberish. And that token is stored encrypted in your browser's storage &mdash; <em>nothing</em> is transmitted to or stored on UPify's web server.</p>\\n\\n      <p>UPify doesn't have ads or tracking of any kind. No cookies here, no siree.</p>\`\\n    }\\n  ];\\n\\n  export function show_q( id ) {\\n    faq.forEach( q => {\\n      if ( id === q.id ) {\\n        q.element.setAttribute( 'open', 'open' );\\n      } else {\\n        q.element.removeAttribute( 'open' );\\n      }\\n    } );\\n  }\\n<\/script>\\n\\n<style>\\n  details + details {\\n    margin-top: 32px;\\n  }\\n  summary {\\n    display: flex;\\n    flex-flow: row nowrap;\\n    align-items: center;\\n    list-style: none;\\n    position: relative;\\n    cursor: pointer;\\n  }\\n\\n  summary::-webkit-details-marker {\\n    display: none;\\n  }\\n\\n  summary::before {\\n    content: '';\\n    position: absolute;\\n    top: 50%;\\n    left: -32px;\\n    width: 14px;\\n    height: 14px;\\n    border: 4px solid rgb(var(--text));\\n    border-width: 0 4px 4px 0;\\n    transform: translateY(-80%) rotate(45deg);\\n  }\\n\\n  summary:focus {\\n    outline: none;\\n  }\\n\\n  details[open] summary::before {\\n    transform: translateY(-40%) rotate(225deg);\\n  }\\n\\n  h2 {\\n    margin: 0;\\n    color: rgb(var(--text));\\n  }\\n\\n  :global(.portrait) {\\n    --size: calc(var(--gap) * 8 );\\n    width: var(--size);\\n    height: var(--size);\\n    background: rgb(var(--c-accent)) url('/me.jpg') no-repeat center / cover;\\n    background-blend-mode: multiply;\\n    float: left;\\n    margin: 1em 1em 0 0;\\n  }\\n</style>\\n\\n{#each faq as q}\\n  <details bind:this={q.element} open={ q.open } on:click={ () => { faq.forEach( qu => { if( qu.element !== q.element ) qu.element.removeAttribute( 'open' ) } )} }>\\n    <summary><h2>{@html q.title }</h2></summary>\\n    {@html q.content }\\n  </details>\\n{/each}\\n"],"names":[],"mappings":"AA8CE,sBAAO,CAAG,OAAO,eAAC,CAAC,AACjB,UAAU,CAAE,IAAI,AAClB,CAAC,AACD,OAAO,8BAAC,CAAC,AACP,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CACrB,WAAW,CAAE,MAAM,CACnB,UAAU,CAAE,IAAI,CAChB,QAAQ,CAAE,QAAQ,CAClB,MAAM,CAAE,OAAO,AACjB,CAAC,AAED,qCAAO,wBAAwB,AAAC,CAAC,AAC/B,OAAO,CAAE,IAAI,AACf,CAAC,AAED,qCAAO,QAAQ,AAAC,CAAC,AACf,OAAO,CAAE,EAAE,CACX,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,GAAG,CACR,IAAI,CAAE,KAAK,CACX,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,CACZ,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,IAAI,MAAM,CAAC,CAAC,CAClC,YAAY,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,CAAC,CACzB,SAAS,CAAE,WAAW,IAAI,CAAC,CAAC,OAAO,KAAK,CAAC,AAC3C,CAAC,AAED,qCAAO,MAAM,AAAC,CAAC,AACb,OAAO,CAAE,IAAI,AACf,CAAC,AAED,OAAO,CAAC,IAAI,gBAAC,CAAC,sBAAO,QAAQ,AAAC,CAAC,AAC7B,SAAS,CAAE,WAAW,IAAI,CAAC,CAAC,OAAO,MAAM,CAAC,AAC5C,CAAC,AAED,EAAE,8BAAC,CAAC,AACF,MAAM,CAAE,CAAC,CACT,KAAK,CAAE,IAAI,IAAI,MAAM,CAAC,CAAC,AACzB,CAAC,AAEO,SAAS,AAAE,CAAC,AAClB,MAAM,CAAE,qBAAqB,CAC7B,KAAK,CAAE,IAAI,MAAM,CAAC,CAClB,MAAM,CAAE,IAAI,MAAM,CAAC,CACnB,UAAU,CAAE,IAAI,IAAI,UAAU,CAAC,CAAC,CAAC,IAAI,SAAS,CAAC,CAAC,SAAS,CAAC,MAAM,CAAC,CAAC,CAAC,KAAK,CACxE,qBAAqB,CAAE,QAAQ,CAC/B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,GAAG,CAAC,GAAG,CAAC,CAAC,CAAC,CAAC,AACrB,CAAC"}`
};
var faq = [
  {
    id: "how",
    open: true,
    title: "How does this work?",
    content: `<p>UPify is a web app that lives entirely in your web browser and uses UP\u2019s API to access your account information. All communication with UP happens between your web browser and their servers. None of your information is transmitted to or stored on UPify\u2019s web server in any way.</p>

      <p>UPify is open-source, so if you\u2019re that way inclined feel free to <a href="https://github.com/jono-hayward/dd-upify" target="_blank">check out the source code on GitHub</a>.</p>`
  },
  {
    id: "who",
    title: "Who made this? And why?",
    content: `<figure class="portrait"></figure>

      <p>Hey! I'm <a href="https://twitter.com/jono_hayward" target="_blank">Jono Hayward</a> and I made UPify. I\u2019m not affiliated with UP in any way beyond being a customer myself.</p>

      <p>Up is easily the best banking experience on a mobile device. But while they're focusing on mobile, I'm a big spreadsheet nerd and was missing the ability to track all my transactions on the big screen. I built UPify to let me satisfy this compulsion.</p>

      <p>I made UPify in my spare time. If you like what I\u2019ve done here, feel free to <a href="https://ko-fi.com/ohnojono" target="_blank">buy me a coffee</a>.</p>`
  },
  {
    id: "safety",
    title: "How safe is my info?",
    content: `<p>In a word: <em>very.</em></p>

      <p>All of UPify's functionality uses the <a href="https://developer.up.com.au/" target="_blank">secure API provided by UP</a>. And they're pretty good at that stuff. All information is sent over a secure, encrypted connection, so it's just as safe as using the UP app on your phone.</p>

      <p>The only bit of personal information UPify keeps about you is your personal access token, so you can log in quickly without having to remember 136 characters of gibberish. And that token is stored encrypted in your browser's storage &mdash; <em>nothing</em> is transmitted to or stored on UPify's web server.</p>

      <p>UPify doesn't have ads or tracking of any kind. No cookies here, no siree.</p>`
  }
];
var FAQ = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$h);
  return `${each(faq, (q) => `<details ${q.open ? "open" : ""} class="${"svelte-1wcea2m"}"${add_attribute("this", q.element, 0)}><summary class="${"svelte-1wcea2m"}"><h2 class="${"svelte-1wcea2m"}"><!-- HTML_TAG_START -->${q.title}<!-- HTML_TAG_END --></h2></summary>
    <!-- HTML_TAG_START -->${q.content}<!-- HTML_TAG_END -->
  </details>`)}`;
});
var css$g = {
  code: "#token.svelte-12zs2h1{font-family:var(--mono-font);width:100%;margin:0 0 16px;resize:none}input[type=password].svelte-12zs2h1{font-family:var(--mono-font);letter-spacing:.1em;font-size:1.6em;line-height:1rem;font-weight:bold;padding-left:.6em}details.svelte-12zs2h1{display:block;width:100%}summary.svelte-12zs2h1{display:block;cursor:pointer}summary.svelte-12zs2h1:focus{outline:none}summary.svelte-12zs2h1::-webkit-details-marker{display:none}.button.naked.svelte-12zs2h1{margin:8px 0 0}label.svelte-12zs2h1{color:rgb(var(--c-brand));font-weight:bold;font-size:var(--font-small);text-transform:uppercase;margin:0 0 calc(var(--gap) / 2)}",
  map: `{"version":3,"file":"Login.svelte","sources":["Login.svelte"],"sourcesContent":["<script>\\n  import { fade } from 'svelte/transition';\\n  import { onMount } from 'svelte';\\n  import { goto } from '$app/navigation';\\n\\n  import CryptoJS from 'crypto-js';\\n\\n  import { api } from '$lib/api.js';\\n  import { users, userid, token, logged_in, accounts, categories, tags } from '$lib/store.js';\\n\\n  let input_account = {\\n    token: ''\\n  };\\n  let input_password;\\n  let working = false;\\n  let status_message = '';\\n\\n  let states = {\\n    users: {},\\n    token: {},\\n    save: {}\\n  };\\n  let active_state;\\n\\n  onMount( () => {\\n    if( Object.keys( $users ).length ) {\\n      active_state = 'users';\\n    } else {\\n      active_state = 'token';\\n    }\\n  } );\\n\\n  function login( id, pass = input_password ) {\\n    if ( pass.length ) {\\n\\n      // Use the supplied password as an encryption key to get the saved personal access token\\n      let decrypted_token = CryptoJS.AES.decrypt( $users[id].encrypted_token, pass ).toString(CryptoJS.enc.Utf8);\\n\\n      // Check the decrypted value matches the expected format\\n      if( decrypted_token.length === 136 && decrypted_token.toLowerCase().substring(0, 8) === 'up:yeah:' ) {\\n        // Now we double check the token is valid and matched with the current user\\n        api.ping( decrypted_token ).then( result => {\\n          if ( result.meta.id === id ) {\\n            // If it does, we can log in\\n            $userid = id;\\n            $token = decrypted_token;\\n\\n            // Load all the API data we need, then proceed\\n            Promise.all( [\\n              api.get( 'accounts' ).then( result => $accounts = result.data ),\\n              api.get( 'categories' ).then( result => $categories = result.data ),\\n              api.get( 'tags' ).then( result => $tags = result.data )\\n            ] ).then( () => {\\n              $logged_in = true;\\n              goto( \`/accounts\` );\\n            } );\\n          }\\n        } );\\n      } else {\\n        // If it doesn't, the password is probably wrong.\\n      }\\n    }\\n  }\\n\\n  function add_new() {\\n\\n    if ( input_account.token.length === 136 && input_account.token.toLowerCase().substring(0, 8) === 'up:yeah:' ) {\\n      // Looks like a valid token\\n      status_message = 'Talking to UP&hellip;'\\n      working = true;\\n\\n      api.ping( input_account.token ).then( result => {\\n        input_account.id = result.meta.id;\\n        active_state = 'save';\\n      }, () => {\\n        status_message = 'Authentication failed';\\n        setTimeout( () => {\\n          working = false;\\n          status_message = '';\\n        }, 3000 );\\n      } );\\n    } else {\\n\\n    }\\n\\n  }\\n\\n  function save_account() {\\n    let encrypted_token = CryptoJS.AES.encrypt( input_account.token, input_account.password ).toString();\\n    $users[ input_account.id ] = {\\n      name: input_account.nickname,\\n      encrypted_token: encrypted_token\\n    };\\n    login( input_account.id, input_account.password );\\n  }\\n<\/script>\\n\\n<style>\\n  #token {\\n    font-family: var(--mono-font);\\n    /* font-size: 20px; */\\n    width: 100%;\\n    margin: 0 0 16px;\\n    resize: none;\\n  }\\n  input[type=password] {\\n    font-family: var(--mono-font);\\n    letter-spacing: .1em;\\n    font-size: 1.6em;\\n    line-height: 1rem;\\n    font-weight: bold;\\n    padding-left: .6em;\\n  }\\n  details {\\n    display: block;\\n    width: 100%;\\n  }\\n  summary {\\n    display: block;\\n    cursor: pointer;\\n  }\\n  summary:focus {\\n    outline: none;\\n  }\\n  summary::-webkit-details-marker {\\n    display: none;\\n  }\\n  .button.naked {\\n    margin: 8px 0 0;\\n  }\\n  label {\\n    color: rgb(var(--c-brand));\\n    font-weight: bold;\\n    font-size: var(--font-small);\\n    text-transform: uppercase;\\n    margin: 0 0 calc(var(--gap) / 2);\\n  }\\n</style>\\n\\n<svelte:head><title>\u26A1\uFE0FUPify &ndash; the missing UP desktop viewer</title></svelte:head>\\n\\n{#if active_state === 'users'}<section bind:this={states.users.el}>\\n  <h2>Welcome back.</h2>\\n  {#if Object.keys( $users ).length === 1}\\n  <p>Type your password in below to sign in.</p>\\n  {:else}\\n  <p>Choose your account from the list and type in your password to sign in.</p>\\n  {/if}\\n\\n  {#each Object.keys($users) as u, i}\\n  <form on:submit|preventDefault={login(u)}><fieldset><details open={i === 0}>\\n\\n    <summary><strong>{$users[u].name}</strong></summary>\\n    <label for=\\"{u}_password\\">Password:</label>\\n\\n    <div class=\\"input-group\\">\\n      <input type=\\"password\\" id=\\"{u}_password\\" bind:value={input_password}>\\n      <button type=\\"submit\\" class=\\"inline-button\\">\\n        <i class=\\"fas fa-arrow-right\\"></i>\\n        <span class=\\"hidden\\">Log in</span>\\n      </button>\\n    </div>\\n\\n  </details></fieldset></form>{/each}\\n\\n  <button class=\\"button  naked\\" on:click={() => active_state = 'token'}>Add new user</button>\\n</section>{/if}\\n\\n{#if active_state === 'token'}<section bind:this={states.token.el}>\\n\\n  <h2>Hi there.</h2>\\n  <p>To get started, you\u2019ll need to grab your UP personal access token. This is what lets UPify talk to UP and get your account details. Don\u2019t worry, this will be easy.</p>\\n  <p>Head to <a href=\\"https://api.up.com.au/\\" target=\\"_blank\\">api.up.com.au</a> and follow the instructions there. Once you have your token, paste it into the field below and you\u2019re golden.</p>\\n\\n  <form on:submit|preventDefault={add_new}>\\n    <fieldset>\\n      <label for=\\"token\\">Personal access token:</label>\\n      <textarea id=\\"token\\" bind:value={input_account.token} rows=\\"1\\" maxlength=\\"136\\" on:input={ (e) => { e.target.style.height = '1px'; e.target.style.height = e.target.scrollHeight + 2 + 'px'; } }></textarea>\\n      <input type=\\"submit\\" class=\\"button\\" value=\\"Let's go!\\" disabled={ input_account.token.length < 136 }>\\n      {#if working}<aside class=\\"status\\" transition:fade>\\n        <span>{@html status_message}</span>\\n      </aside>{/if}\\n    </fieldset>\\n  </form>\\n\\n</section>{/if}\\n\\n{#if active_state === 'save'}<section bind:this={states.save.el}>\\n\\n  <h2>Ok fab, your token looks good <span class=\\"emoji\\">\u{1F44D}</span></h2>\\n  <p>UPify will keep your token securely in your web browser's local storage. To keep it safe and allow you to log in quickly later on, please provide an account nickname and a password.</p>\\n  <p><strong>Important:</strong> Because this data is only stored in your browser, if you forget your password it cannot be reset or retrieved. If this happens you'll need to create a new personal access token and log in again from scratch.</p>\\n\\n  <form on:submit|preventDefault={save_account}>\\n    <fieldset>\\n      <label for=\\"nickname\\">Account nickname:</label>\\n      <input type=\\"text\\" bind:value={input_account.nickname} id=\\"nickname\\">\\n      <label for=\\"password\\">Password:</label>\\n      <input type=\\"password\\" bind:value={input_account.password} id=\\"password\\">\\n      <input type=\\"submit\\" class=\\"button\\" value=\\"Save account and log in\\" disabled={ input_account.nickname && input_account.nickname.length < 4 || !input_account.password }>\\n    </fieldset>\\n  </form>\\n\\n</section>{/if}\\n"],"names":[],"mappings":"AAkGE,MAAM,eAAC,CAAC,AACN,WAAW,CAAE,IAAI,WAAW,CAAC,CAE7B,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,CAChB,MAAM,CAAE,IAAI,AACd,CAAC,AACD,KAAK,CAAC,IAAI,CAAC,QAAQ,CAAC,eAAC,CAAC,AACpB,WAAW,CAAE,IAAI,WAAW,CAAC,CAC7B,cAAc,CAAE,IAAI,CACpB,SAAS,CAAE,KAAK,CAChB,WAAW,CAAE,IAAI,CACjB,WAAW,CAAE,IAAI,CACjB,YAAY,CAAE,IAAI,AACpB,CAAC,AACD,OAAO,eAAC,CAAC,AACP,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,IAAI,AACb,CAAC,AACD,OAAO,eAAC,CAAC,AACP,OAAO,CAAE,KAAK,CACd,MAAM,CAAE,OAAO,AACjB,CAAC,AACD,sBAAO,MAAM,AAAC,CAAC,AACb,OAAO,CAAE,IAAI,AACf,CAAC,AACD,sBAAO,wBAAwB,AAAC,CAAC,AAC/B,OAAO,CAAE,IAAI,AACf,CAAC,AACD,OAAO,MAAM,eAAC,CAAC,AACb,MAAM,CAAE,GAAG,CAAC,CAAC,CAAC,CAAC,AACjB,CAAC,AACD,KAAK,eAAC,CAAC,AACL,KAAK,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC1B,WAAW,CAAE,IAAI,CACjB,SAAS,CAAE,IAAI,YAAY,CAAC,CAC5B,cAAc,CAAE,SAAS,CACzB,MAAM,CAAE,CAAC,CAAC,CAAC,CAAC,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,AAClC,CAAC"}`
};
var Login = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_users;
  let $$unsubscribe_logged_in;
  let $$unsubscribe_tags;
  let $$unsubscribe_categories;
  let $$unsubscribe_accounts;
  let $$unsubscribe_token;
  let $$unsubscribe_userid;
  $$unsubscribe_users = subscribe(users, (value) => value);
  $$unsubscribe_logged_in = subscribe(logged_in, (value) => value);
  $$unsubscribe_tags = subscribe(tags, (value) => value);
  $$unsubscribe_categories = subscribe(categories$1, (value) => value);
  $$unsubscribe_accounts = subscribe(accounts, (value) => value);
  $$unsubscribe_token = subscribe(token, (value) => value);
  $$unsubscribe_userid = subscribe(userid, (value) => value);
  $$result.css.add(css$g);
  $$unsubscribe_users();
  $$unsubscribe_logged_in();
  $$unsubscribe_tags();
  $$unsubscribe_categories();
  $$unsubscribe_accounts();
  $$unsubscribe_token();
  $$unsubscribe_userid();
  return `${$$result.head += `${$$result.title = `<title>\u26A1\uFE0FUPify \u2013 the missing UP desktop viewer</title>`, ""}`, ""}

${``}

${``}

${``}`;
});
var css$f = {
  code: "article.svelte-1z0om8s.svelte-1z0om8s{display:flex;flex-flow:row nowrap;position:fixed;top:0;right:0;bottom:0;left:0}aside.svelte-1z0om8s.svelte-1z0om8s{flex:1 1 50%;overflow:hidden;background-color:rgb(var(--c-brand));transition:background-color 650ms cubic-bezier(0.075, 0.820, 0.165, 1.000);margin:var(--gap)}aside.active.svelte-1z0om8s.svelte-1z0om8s{background-color:rgb(var(--c-accent))}aside.active.svelte-1z0om8s section.svelte-1z0om8s{transform:translate3d(0, -100%, 1px)}section.svelte-1z0om8s.svelte-1z0om8s{height:100vh;flex:0 0 100vh;padding:0 7vw;display:flex;flex-flow:column;justify-content:center;transition:transform 650ms cubic-bezier(0.075, 0.820, 0.165, 1.000);overflow:auto;transform:translate3d(0, 0, 1px)}section.intro.svelte-1z0om8s .logo.svelte-1z0om8s{height:110px;width:auto}section.intro.svelte-1z0om8s .button.svelte-1z0om8s{background:rgb(var(--c-accent))}section.faq.svelte-1z0om8s.svelte-1z0om8s{--text:var(--c-background-darker)}section.faq.svelte-1z0om8s header.svelte-1z0om8s{display:flex;justify-content:space-between;align-items:center;padding:64px 0 16px;flex:0 0 auto}section.faq.svelte-1z0om8s main.svelte-1z0om8s{flex:1 1;display:flex;flex-flow:column;justify-content:center}section.faq.svelte-1z0om8s .logo.svelte-1z0om8s{height:68px;width:auto}aside.login.svelte-1z0om8s.svelte-1z0om8s{display:flex;flex-flow:column;justify-content:center;background:rgb(var(--c-background-darker));padding:0 5vw}",
  map: `{"version":3,"file":"Landing.svelte","sources":["Landing.svelte"],"sourcesContent":["<script>\\n  import FAQ, { show_q } from '$lib/FAQ.svelte';\\n  import Login from '$lib/Login.svelte';\\n\\n  let show_faq = false;\\n<\/script>\\n\\n<style>\\n  article {\\n    display: flex;\\n    flex-flow: row nowrap;\\n\\n    position: fixed;\\n    top: 0;\\n    right: 0;\\n    bottom: 0;\\n    left: 0;\\n  }\\n\\n  aside {\\n    flex: 1 1 50%;\\n    overflow: hidden;\\n    background-color: rgb(var(--c-brand));\\n    transition: background-color 650ms cubic-bezier(0.075, 0.820, 0.165, 1.000);\\n    margin: var(--gap);\\n  }\\n  aside.active {\\n    background-color: rgb(var(--c-accent));\\n  }\\n\\n  aside.active section {\\n    transform: translate3d(0, -100%, 1px);\\n  }\\n\\n\\n  section {\\n    height: 100vh;\\n    flex: 0 0 100vh;\\n    padding: 0 7vw;\\n    display: flex;\\n    flex-flow: column;\\n    justify-content: center;\\n    transition: transform 650ms cubic-bezier(0.075, 0.820, 0.165, 1.000);\\n    overflow: auto;\\n    transform: translate3d(0, 0, 1px);\\n  }\\n\\n\\n  section.intro .logo {\\n    height: 110px;\\n    width: auto;\\n  }\\n\\n  section.intro .button {\\n    background: rgb(var(--c-accent));\\n  }\\n\\n  section.faq {\\n    --text: var(--c-background-darker);\\n  }\\n\\n  section.faq header {\\n    display: flex;\\n    justify-content: space-between;\\n    align-items: center;\\n    padding: 64px 0 16px;\\n    flex: 0 0 auto;\\n  }\\n\\n  section.faq main {\\n    flex: 1 1;\\n    display: flex;\\n    flex-flow: column;\\n    justify-content: center;\\n  }\\n\\n  section.faq .logo {\\n    height: 68px;\\n    width: auto;\\n  }\\n\\n  aside.login {\\n    display: flex;\\n    flex-flow: column;\\n    justify-content: center;\\n    background: rgb(var(--c-background-darker));\\n    padding: 0 5vw;\\n  }\\n</style>\\n\\n<svelte:head>\\n  <title>UPify &mdash; the missing UP desktop app</title>\\n</svelte:head>\\n\\n<article>\\n  <aside class=\\"about  { show_faq ? 'active' : ''}\\">\\n\\n    <section class=\\"intro\\"><div>\\n      <h1><img class=\\"logo\\" src=\\"/logo.svg\\" alt=\\"UPify logo\\"></h1>\\n      <h2>See the whole picture</h2>\\n      <p class=\\"large\\">\\n        Upify is a simple, <a href=\\"#safety\\" on:click|preventDefault={ () => { show_q('safety'); show_faq = true } }>secure</a> way to see everything happening in your <a href=\\"https://www.up.com.au\\" target=\\"_blank\\">UP</a> account but on a screen that's, well,&nbsp;<em>bigger</em> (you size queen, you).\\n      </p>\\n      <button class=\\"button\\" on:click={ () => show_faq = true }>Tell me more</button>\\n    </div></section>\\n\\n    <section class=\\"faq\\">\\n      <header>\\n        <img class=\\"logo\\" src=\\"logo--mono.svg\\" alt=\\"UPify logo\\">\\n        <button class=\\"button  naked\\" on:click={ () => show_faq = false }>Go back</button>\\n      </header>\\n\\n      <main>\\n        <FAQ />\\n      </main>\\n\\n    </section>\\n\\n  </aside>\\n\\n  <aside class=\\"login\\"><div>\\n    <Login />\\n  </div></aside>\\n</article>\\n"],"names":[],"mappings":"AAQE,OAAO,8BAAC,CAAC,AACP,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CAErB,QAAQ,CAAE,KAAK,CACf,GAAG,CAAE,CAAC,CACN,KAAK,CAAE,CAAC,CACR,MAAM,CAAE,CAAC,CACT,IAAI,CAAE,CAAC,AACT,CAAC,AAED,KAAK,8BAAC,CAAC,AACL,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,GAAG,CACb,QAAQ,CAAE,MAAM,CAChB,gBAAgB,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CACrC,UAAU,CAAE,gBAAgB,CAAC,KAAK,CAAC,aAAa,KAAK,CAAC,CAAC,KAAK,CAAC,CAAC,KAAK,CAAC,CAAC,KAAK,CAAC,CAC3E,MAAM,CAAE,IAAI,KAAK,CAAC,AACpB,CAAC,AACD,KAAK,OAAO,8BAAC,CAAC,AACZ,gBAAgB,CAAE,IAAI,IAAI,UAAU,CAAC,CAAC,AACxC,CAAC,AAED,KAAK,sBAAO,CAAC,OAAO,eAAC,CAAC,AACpB,SAAS,CAAE,YAAY,CAAC,CAAC,CAAC,KAAK,CAAC,CAAC,GAAG,CAAC,AACvC,CAAC,AAGD,OAAO,8BAAC,CAAC,AACP,MAAM,CAAE,KAAK,CACb,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,KAAK,CACf,OAAO,CAAE,CAAC,CAAC,GAAG,CACd,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,MAAM,CACjB,eAAe,CAAE,MAAM,CACvB,UAAU,CAAE,SAAS,CAAC,KAAK,CAAC,aAAa,KAAK,CAAC,CAAC,KAAK,CAAC,CAAC,KAAK,CAAC,CAAC,KAAK,CAAC,CACpE,QAAQ,CAAE,IAAI,CACd,SAAS,CAAE,YAAY,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AACnC,CAAC,AAGD,OAAO,qBAAM,CAAC,KAAK,eAAC,CAAC,AACnB,MAAM,CAAE,KAAK,CACb,KAAK,CAAE,IAAI,AACb,CAAC,AAED,OAAO,qBAAM,CAAC,OAAO,eAAC,CAAC,AACrB,UAAU,CAAE,IAAI,IAAI,UAAU,CAAC,CAAC,AAClC,CAAC,AAED,OAAO,IAAI,8BAAC,CAAC,AACX,MAAM,CAAE,0BAA0B,AACpC,CAAC,AAED,OAAO,mBAAI,CAAC,MAAM,eAAC,CAAC,AAClB,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,CACnB,OAAO,CAAE,IAAI,CAAC,CAAC,CAAC,IAAI,CACpB,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,AAChB,CAAC,AAED,OAAO,mBAAI,CAAC,IAAI,eAAC,CAAC,AAChB,IAAI,CAAE,CAAC,CAAC,CAAC,CACT,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,MAAM,CACjB,eAAe,CAAE,MAAM,AACzB,CAAC,AAED,OAAO,mBAAI,CAAC,KAAK,eAAC,CAAC,AACjB,MAAM,CAAE,IAAI,CACZ,KAAK,CAAE,IAAI,AACb,CAAC,AAED,KAAK,MAAM,8BAAC,CAAC,AACX,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,MAAM,CACjB,eAAe,CAAE,MAAM,CACvB,UAAU,CAAE,IAAI,IAAI,qBAAqB,CAAC,CAAC,CAC3C,OAAO,CAAE,CAAC,CAAC,GAAG,AAChB,CAAC"}`
};
var Landing = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  $$result.css.add(css$f);
  return `${$$result.head += `${$$result.title = `<title>UPify \u2014 the missing UP desktop app</title>`, ""}`, ""}

<article class="${"svelte-1z0om8s"}"><aside class="${"about " + escape2("") + " svelte-1z0om8s"}"><section class="${"intro svelte-1z0om8s"}"><div><h1><img class="${"logo svelte-1z0om8s"}" src="${"/logo.svg"}" alt="${"UPify logo"}"></h1>
      <h2>See the whole picture</h2>
      <p class="${"large"}">Upify is a simple, <a href="${"#safety"}">secure</a> way to see everything happening in your <a href="${"https://www.up.com.au"}" target="${"_blank"}">UP</a> account but on a screen that&#39;s, well,\xA0<em>bigger</em> (you size queen, you).
      </p>
      <button class="${"button svelte-1z0om8s"}">Tell me more</button></div></section>

    <section class="${"faq svelte-1z0om8s"}"><header class="${"svelte-1z0om8s"}"><img class="${"logo svelte-1z0om8s"}" src="${"logo--mono.svg"}" alt="${"UPify logo"}">
        <button class="${"button naked"}">Go back</button></header>

      <main class="${"svelte-1z0om8s"}">${validate_component(FAQ, "FAQ").$$render($$result, {}, {}, {})}</main></section></aside>

  <aside class="${"login svelte-1z0om8s"}"><div>${validate_component(Login, "Login").$$render($$result, {}, {}, {})}</div></aside></article>`;
});
var css$e = {
  code: "article.svelte-1xdiop9{min-width:768px}.header.svelte-1xdiop9{position:fixed;top:0;left:0;right:0;z-index:10}.content.svelte-1xdiop9{margin:80px 16px 16px}",
  map: `{"version":3,"file":"__layout.svelte","sources":["__layout.svelte"],"sourcesContent":["<script>\\n\\timport { onMount } from 'svelte';\\n\\timport { goto } from '$app/navigation';\\n\\n\\timport { u, logged_in, accounts } from '$lib/store.js';\\n\\timport { api } from '$lib/api.js';\\n\\n\\timport Nav from '$lib/Nav.svelte';\\n\\timport Landing from '$lib/Landing.svelte';\\n\\n\\timport '../app.css';\\n\\n\\t$: set_contrast( $u );\\n\\tconst set_contrast = user => user && document.body.classList[ user.contrast ? 'add' : 'remove' ]('high-contrast');\\n\\n\\tonMount( () => $logged_in && api.get( 'accounts' ).then( result => $accounts = result.data ) || goto( '/' ) );\\n\\n<\/script>\\n\\n<style>\\n\\tarticle {\\n\\t\\tmin-width: 768px;\\n\\t}\\n\\t.header {\\n\\t\\tposition: fixed;\\n\\t\\ttop: 0;\\n\\t\\tleft: 0;\\n\\t\\tright: 0;\\n\\t\\tz-index: 10;\\n\\t}\\n\\n\\t.content {\\n\\t\\tmargin: 80px 16px 16px;\\n\\t}\\n</style>\\n\\n<article>\\n\\t{#if $logged_in}\\n\\t<header class=\\"header\\">\\n\\t\\t<Nav />\\n\\t</header>\\n\\t<main class=\\"content\\">\\n\\t\\t<slot />\\n\\t</main>\\n\\t{:else}\\n\\t<Landing />\\n\\t{/if}\\n</article>\\n"],"names":[],"mappings":"AAoBC,OAAO,eAAC,CAAC,AACR,SAAS,CAAE,KAAK,AACjB,CAAC,AACD,OAAO,eAAC,CAAC,AACR,QAAQ,CAAE,KAAK,CACf,GAAG,CAAE,CAAC,CACN,IAAI,CAAE,CAAC,CACP,KAAK,CAAE,CAAC,CACR,OAAO,CAAE,EAAE,AACZ,CAAC,AAED,QAAQ,eAAC,CAAC,AACT,MAAM,CAAE,IAAI,CAAC,IAAI,CAAC,IAAI,AACvB,CAAC"}`
};
var _layout = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_accounts;
  let $logged_in, $$unsubscribe_logged_in;
  let $u, $$unsubscribe_u;
  $$unsubscribe_accounts = subscribe(accounts, (value) => value);
  $$unsubscribe_logged_in = subscribe(logged_in, (value) => $logged_in = value);
  $$unsubscribe_u = subscribe(u, (value) => $u = value);
  const set_contrast = (user) => user && document.body.classList[user.contrast ? "add" : "remove"]("high-contrast");
  $$result.css.add(css$e);
  {
    set_contrast($u);
  }
  $$unsubscribe_accounts();
  $$unsubscribe_logged_in();
  $$unsubscribe_u();
  return `<article class="${"svelte-1xdiop9"}">${$logged_in ? `<header class="${"header svelte-1xdiop9"}">${validate_component(Nav, "Nav").$$render($$result, {}, {}, {})}</header>
	<main class="${"content svelte-1xdiop9"}">${slots.default ? slots.default({}) : ``}</main>` : `${validate_component(Landing, "Landing").$$render($$result, {}, {}, {})}`}</article>`;
});
var __layout = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": _layout
});
function load({ error: error2, status }) {
  return { props: { error: error2, status } };
}
var Error$1 = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { status } = $$props;
  let { error: error2 } = $$props;
  if ($$props.status === void 0 && $$bindings.status && status !== void 0)
    $$bindings.status(status);
  if ($$props.error === void 0 && $$bindings.error && error2 !== void 0)
    $$bindings.error(error2);
  return `<h1>${escape2(status)}</h1>

<pre>${escape2(error2.message)}</pre>



${error2.frame ? `<pre>${escape2(error2.frame)}</pre>` : ``}
${error2.stack ? `<pre>${escape2(error2.stack)}</pre>` : ``}`;
});
var error = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Error$1,
  load
});
var Categories = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `${$$result.head += `${$$result.title = `<title>Categories \u2014 UPify</title>`, ""}`, ""}

<h2>Categories</h2>`;
});
var categories = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Categories
});
var Accounts = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_accounts;
  $$unsubscribe_accounts = subscribe(accounts, (value) => value);
  $$unsubscribe_accounts();
  return ``;
});
var index = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Accounts
});
var HOOKS = [
  "onChange",
  "onClose",
  "onDayCreate",
  "onDestroy",
  "onKeyDown",
  "onMonthChange",
  "onOpen",
  "onParseConfig",
  "onReady",
  "onValueUpdate",
  "onYearChange",
  "onPreCalendarPosition"
];
var defaults = {
  _disable: [],
  allowInput: false,
  allowInvalidPreload: false,
  altFormat: "F j, Y",
  altInput: false,
  altInputClass: "form-control input",
  animate: typeof window === "object" && window.navigator.userAgent.indexOf("MSIE") === -1,
  ariaDateFormat: "F j, Y",
  autoFillDefaultTime: true,
  clickOpens: true,
  closeOnSelect: true,
  conjunction: ", ",
  dateFormat: "Y-m-d",
  defaultHour: 12,
  defaultMinute: 0,
  defaultSeconds: 0,
  disable: [],
  disableMobile: false,
  enableSeconds: false,
  enableTime: false,
  errorHandler: (err) => typeof console !== "undefined" && console.warn(err),
  getWeek: (givenDate) => {
    const date = new Date(givenDate.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    var week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 864e5 - 3 + (week1.getDay() + 6) % 7) / 7);
  },
  hourIncrement: 1,
  ignoredFocusElements: [],
  inline: false,
  locale: "default",
  minuteIncrement: 5,
  mode: "single",
  monthSelectorType: "dropdown",
  nextArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M13.207 8.472l-7.854 7.854-0.707-0.707 7.146-7.146-7.146-7.148 0.707-0.707 7.854 7.854z' /></svg>",
  noCalendar: false,
  now: new Date(),
  onChange: [],
  onClose: [],
  onDayCreate: [],
  onDestroy: [],
  onKeyDown: [],
  onMonthChange: [],
  onOpen: [],
  onParseConfig: [],
  onReady: [],
  onValueUpdate: [],
  onYearChange: [],
  onPreCalendarPosition: [],
  plugins: [],
  position: "auto",
  positionElement: void 0,
  prevArrow: "<svg version='1.1' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' viewBox='0 0 17 17'><g></g><path d='M5.207 8.471l7.146 7.147-0.707 0.707-7.853-7.854 7.854-7.853 0.707 0.707-7.147 7.146z' /></svg>",
  shorthandCurrentMonth: false,
  showMonths: 1,
  static: false,
  time_24hr: false,
  weekNumbers: false,
  wrap: false
};
var english = {
  weekdays: {
    shorthand: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    longhand: [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday"
    ]
  },
  months: {
    shorthand: [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec"
    ],
    longhand: [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December"
    ]
  },
  daysInMonth: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
  firstDayOfWeek: 0,
  ordinal: (nth) => {
    const s2 = nth % 100;
    if (s2 > 3 && s2 < 21)
      return "th";
    switch (s2 % 10) {
      case 1:
        return "st";
      case 2:
        return "nd";
      case 3:
        return "rd";
      default:
        return "th";
    }
  },
  rangeSeparator: " to ",
  weekAbbreviation: "Wk",
  scrollTitle: "Scroll to increment",
  toggleTitle: "Click to toggle",
  amPM: ["AM", "PM"],
  yearAriaLabel: "Year",
  monthAriaLabel: "Month",
  hourAriaLabel: "Hour",
  minuteAriaLabel: "Minute",
  time_24hr: false
};
var pad = (number, length = 2) => `000${number}`.slice(length * -1);
var int = (bool) => bool === true ? 1 : 0;
function debounce$1(fn, wait) {
  let t;
  return function() {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, arguments), wait);
  };
}
var arrayify = (obj) => obj instanceof Array ? obj : [obj];
function toggleClass(elem, className, bool) {
  if (bool === true)
    return elem.classList.add(className);
  elem.classList.remove(className);
}
function createElement(tag, className, content) {
  const e = window.document.createElement(tag);
  className = className || "";
  content = content || "";
  e.className = className;
  if (content !== void 0)
    e.textContent = content;
  return e;
}
function clearNode(node) {
  while (node.firstChild)
    node.removeChild(node.firstChild);
}
function findParent(node, condition) {
  if (condition(node))
    return node;
  else if (node.parentNode)
    return findParent(node.parentNode, condition);
  return void 0;
}
function createNumberInput(inputClassName, opts) {
  const wrapper = createElement("div", "numInputWrapper"), numInput = createElement("input", "numInput " + inputClassName), arrowUp = createElement("span", "arrowUp"), arrowDown = createElement("span", "arrowDown");
  if (navigator.userAgent.indexOf("MSIE 9.0") === -1) {
    numInput.type = "number";
  } else {
    numInput.type = "text";
    numInput.pattern = "\\d*";
  }
  if (opts !== void 0)
    for (const key in opts)
      numInput.setAttribute(key, opts[key]);
  wrapper.appendChild(numInput);
  wrapper.appendChild(arrowUp);
  wrapper.appendChild(arrowDown);
  return wrapper;
}
function getEventTarget(event) {
  try {
    if (typeof event.composedPath === "function") {
      const path = event.composedPath();
      return path[0];
    }
    return event.target;
  } catch (error2) {
    return event.target;
  }
}
var doNothing = () => void 0;
var monthToStr = (monthNumber, shorthand, locale) => locale.months[shorthand ? "shorthand" : "longhand"][monthNumber];
var revFormat = {
  D: doNothing,
  F: function(dateObj, monthName, locale) {
    dateObj.setMonth(locale.months.longhand.indexOf(monthName));
  },
  G: (dateObj, hour) => {
    dateObj.setHours(parseFloat(hour));
  },
  H: (dateObj, hour) => {
    dateObj.setHours(parseFloat(hour));
  },
  J: (dateObj, day) => {
    dateObj.setDate(parseFloat(day));
  },
  K: (dateObj, amPM, locale) => {
    dateObj.setHours(dateObj.getHours() % 12 + 12 * int(new RegExp(locale.amPM[1], "i").test(amPM)));
  },
  M: function(dateObj, shortMonth, locale) {
    dateObj.setMonth(locale.months.shorthand.indexOf(shortMonth));
  },
  S: (dateObj, seconds) => {
    dateObj.setSeconds(parseFloat(seconds));
  },
  U: (_, unixSeconds) => new Date(parseFloat(unixSeconds) * 1e3),
  W: function(dateObj, weekNum, locale) {
    const weekNumber = parseInt(weekNum);
    const date = new Date(dateObj.getFullYear(), 0, 2 + (weekNumber - 1) * 7, 0, 0, 0, 0);
    date.setDate(date.getDate() - date.getDay() + locale.firstDayOfWeek);
    return date;
  },
  Y: (dateObj, year) => {
    dateObj.setFullYear(parseFloat(year));
  },
  Z: (_, ISODate) => new Date(ISODate),
  d: (dateObj, day) => {
    dateObj.setDate(parseFloat(day));
  },
  h: (dateObj, hour) => {
    dateObj.setHours(parseFloat(hour));
  },
  i: (dateObj, minutes) => {
    dateObj.setMinutes(parseFloat(minutes));
  },
  j: (dateObj, day) => {
    dateObj.setDate(parseFloat(day));
  },
  l: doNothing,
  m: (dateObj, month) => {
    dateObj.setMonth(parseFloat(month) - 1);
  },
  n: (dateObj, month) => {
    dateObj.setMonth(parseFloat(month) - 1);
  },
  s: (dateObj, seconds) => {
    dateObj.setSeconds(parseFloat(seconds));
  },
  u: (_, unixMillSeconds) => new Date(parseFloat(unixMillSeconds)),
  w: doNothing,
  y: (dateObj, year) => {
    dateObj.setFullYear(2e3 + parseFloat(year));
  }
};
var tokenRegex = {
  D: "(\\w+)",
  F: "(\\w+)",
  G: "(\\d\\d|\\d)",
  H: "(\\d\\d|\\d)",
  J: "(\\d\\d|\\d)\\w+",
  K: "",
  M: "(\\w+)",
  S: "(\\d\\d|\\d)",
  U: "(.+)",
  W: "(\\d\\d|\\d)",
  Y: "(\\d{4})",
  Z: "(.+)",
  d: "(\\d\\d|\\d)",
  h: "(\\d\\d|\\d)",
  i: "(\\d\\d|\\d)",
  j: "(\\d\\d|\\d)",
  l: "(\\w+)",
  m: "(\\d\\d|\\d)",
  n: "(\\d\\d|\\d)",
  s: "(\\d\\d|\\d)",
  u: "(.+)",
  w: "(\\d\\d|\\d)",
  y: "(\\d{2})"
};
var formats = {
  Z: (date) => date.toISOString(),
  D: function(date, locale, options22) {
    return locale.weekdays.shorthand[formats.w(date, locale, options22)];
  },
  F: function(date, locale, options22) {
    return monthToStr(formats.n(date, locale, options22) - 1, false, locale);
  },
  G: function(date, locale, options22) {
    return pad(formats.h(date, locale, options22));
  },
  H: (date) => pad(date.getHours()),
  J: function(date, locale) {
    return locale.ordinal !== void 0 ? date.getDate() + locale.ordinal(date.getDate()) : date.getDate();
  },
  K: (date, locale) => locale.amPM[int(date.getHours() > 11)],
  M: function(date, locale) {
    return monthToStr(date.getMonth(), true, locale);
  },
  S: (date) => pad(date.getSeconds()),
  U: (date) => date.getTime() / 1e3,
  W: function(date, _, options22) {
    return options22.getWeek(date);
  },
  Y: (date) => pad(date.getFullYear(), 4),
  d: (date) => pad(date.getDate()),
  h: (date) => date.getHours() % 12 ? date.getHours() % 12 : 12,
  i: (date) => pad(date.getMinutes()),
  j: (date) => date.getDate(),
  l: function(date, locale) {
    return locale.weekdays.longhand[date.getDay()];
  },
  m: (date) => pad(date.getMonth() + 1),
  n: (date) => date.getMonth() + 1,
  s: (date) => date.getSeconds(),
  u: (date) => date.getTime(),
  w: (date) => date.getDay(),
  y: (date) => String(date.getFullYear()).substring(2)
};
var createDateFormatter = ({ config = defaults, l10n = english, isMobile = false }) => (dateObj, frmt, overrideLocale) => {
  const locale = overrideLocale || l10n;
  if (config.formatDate !== void 0 && !isMobile) {
    return config.formatDate(dateObj, frmt, locale);
  }
  return frmt.split("").map((c, i, arr) => formats[c] && arr[i - 1] !== "\\" ? formats[c](dateObj, locale, config) : c !== "\\" ? c : "").join("");
};
var createDateParser = ({ config = defaults, l10n = english }) => (date, givenFormat, timeless, customLocale) => {
  if (date !== 0 && !date)
    return void 0;
  const locale = customLocale || l10n;
  let parsedDate;
  const dateOrig = date;
  if (date instanceof Date)
    parsedDate = new Date(date.getTime());
  else if (typeof date !== "string" && date.toFixed !== void 0)
    parsedDate = new Date(date);
  else if (typeof date === "string") {
    const format22 = givenFormat || (config || defaults).dateFormat;
    const datestr = String(date).trim();
    if (datestr === "today") {
      parsedDate = new Date();
      timeless = true;
    } else if (/Z$/.test(datestr) || /GMT$/.test(datestr))
      parsedDate = new Date(date);
    else if (config && config.parseDate)
      parsedDate = config.parseDate(date, format22);
    else {
      parsedDate = !config || !config.noCalendar ? new Date(new Date().getFullYear(), 0, 1, 0, 0, 0, 0) : new Date(new Date().setHours(0, 0, 0, 0));
      let matched, ops = [];
      for (let i = 0, matchIndex = 0, regexStr = ""; i < format22.length; i++) {
        const token2 = format22[i];
        const isBackSlash = token2 === "\\";
        const escaped2 = format22[i - 1] === "\\" || isBackSlash;
        if (tokenRegex[token2] && !escaped2) {
          regexStr += tokenRegex[token2];
          const match = new RegExp(regexStr).exec(date);
          if (match && (matched = true)) {
            ops[token2 !== "Y" ? "push" : "unshift"]({
              fn: revFormat[token2],
              val: match[++matchIndex]
            });
          }
        } else if (!isBackSlash)
          regexStr += ".";
        ops.forEach(({ fn, val }) => parsedDate = fn(parsedDate, val, locale) || parsedDate);
      }
      parsedDate = matched ? parsedDate : void 0;
    }
  }
  if (!(parsedDate instanceof Date && !isNaN(parsedDate.getTime()))) {
    config.errorHandler(new Error(`Invalid date provided: ${dateOrig}`));
    return void 0;
  }
  if (timeless === true)
    parsedDate.setHours(0, 0, 0, 0);
  return parsedDate;
};
function compareDates(date1, date2, timeless = true) {
  if (timeless !== false) {
    return new Date(date1.getTime()).setHours(0, 0, 0, 0) - new Date(date2.getTime()).setHours(0, 0, 0, 0);
  }
  return date1.getTime() - date2.getTime();
}
var isBetween = (ts, ts1, ts2) => {
  return ts > Math.min(ts1, ts2) && ts < Math.max(ts1, ts2);
};
var duration = {
  DAY: 864e5
};
function getDefaultHours(config) {
  let hours = config.defaultHour;
  let minutes = config.defaultMinute;
  let seconds = config.defaultSeconds;
  if (config.minDate !== void 0) {
    const minHour = config.minDate.getHours();
    const minMinutes = config.minDate.getMinutes();
    const minSeconds = config.minDate.getSeconds();
    if (hours < minHour) {
      hours = minHour;
    }
    if (hours === minHour && minutes < minMinutes) {
      minutes = minMinutes;
    }
    if (hours === minHour && minutes === minMinutes && seconds < minSeconds)
      seconds = config.minDate.getSeconds();
  }
  if (config.maxDate !== void 0) {
    const maxHr = config.maxDate.getHours();
    const maxMinutes = config.maxDate.getMinutes();
    hours = Math.min(hours, maxHr);
    if (hours === maxHr)
      minutes = Math.min(maxMinutes, minutes);
    if (hours === maxHr && minutes === maxMinutes)
      seconds = config.maxDate.getSeconds();
  }
  return { hours, minutes, seconds };
}
if (typeof Object.assign !== "function") {
  Object.assign = function(target, ...args) {
    if (!target) {
      throw TypeError("Cannot convert undefined or null to object");
    }
    for (const source of args) {
      if (source) {
        Object.keys(source).forEach((key) => target[key] = source[key]);
      }
    }
    return target;
  };
}
var DEBOUNCED_CHANGE_MS = 300;
function FlatpickrInstance(element, instanceConfig) {
  const self2 = {
    config: Object.assign(Object.assign({}, defaults), flatpickr$2.defaultConfig),
    l10n: english
  };
  self2.parseDate = createDateParser({ config: self2.config, l10n: self2.l10n });
  self2._handlers = [];
  self2.pluginElements = [];
  self2.loadedPlugins = [];
  self2._bind = bind;
  self2._setHoursFromDate = setHoursFromDate;
  self2._positionCalendar = positionCalendar;
  self2.changeMonth = changeMonth;
  self2.changeYear = changeYear;
  self2.clear = clear;
  self2.close = close;
  self2._createElement = createElement;
  self2.destroy = destroy;
  self2.isEnabled = isEnabled;
  self2.jumpToDate = jumpToDate;
  self2.open = open;
  self2.redraw = redraw;
  self2.set = set;
  self2.setDate = setDate;
  self2.toggle = toggle;
  function setupHelperFunctions() {
    self2.utils = {
      getDaysInMonth(month = self2.currentMonth, yr = self2.currentYear) {
        if (month === 1 && (yr % 4 === 0 && yr % 100 !== 0 || yr % 400 === 0))
          return 29;
        return self2.l10n.daysInMonth[month];
      }
    };
  }
  function init2() {
    self2.element = self2.input = element;
    self2.isOpen = false;
    parseConfig();
    setupLocale();
    setupInputs();
    setupDates();
    setupHelperFunctions();
    if (!self2.isMobile)
      build();
    bindEvents();
    if (self2.selectedDates.length || self2.config.noCalendar) {
      if (self2.config.enableTime) {
        setHoursFromDate(self2.config.noCalendar ? self2.latestSelectedDateObj : void 0);
      }
      updateValue(false);
    }
    setCalendarWidth();
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (!self2.isMobile && isSafari) {
      positionCalendar();
    }
    triggerEvent("onReady");
  }
  function bindToInstance(fn) {
    return fn.bind(self2);
  }
  function setCalendarWidth() {
    const config = self2.config;
    if (config.weekNumbers === false && config.showMonths === 1) {
      return;
    } else if (config.noCalendar !== true) {
      window.requestAnimationFrame(function() {
        if (self2.calendarContainer !== void 0) {
          self2.calendarContainer.style.visibility = "hidden";
          self2.calendarContainer.style.display = "block";
        }
        if (self2.daysContainer !== void 0) {
          const daysWidth = (self2.days.offsetWidth + 1) * config.showMonths;
          self2.daysContainer.style.width = daysWidth + "px";
          self2.calendarContainer.style.width = daysWidth + (self2.weekWrapper !== void 0 ? self2.weekWrapper.offsetWidth : 0) + "px";
          self2.calendarContainer.style.removeProperty("visibility");
          self2.calendarContainer.style.removeProperty("display");
        }
      });
    }
  }
  function updateTime(e) {
    if (self2.selectedDates.length === 0) {
      const defaultDate = self2.config.minDate === void 0 || compareDates(new Date(), self2.config.minDate) >= 0 ? new Date() : new Date(self2.config.minDate.getTime());
      const defaults2 = getDefaultHours(self2.config);
      defaultDate.setHours(defaults2.hours, defaults2.minutes, defaults2.seconds, defaultDate.getMilliseconds());
      self2.selectedDates = [defaultDate];
      self2.latestSelectedDateObj = defaultDate;
    }
    if (e !== void 0 && e.type !== "blur") {
      timeWrapper(e);
    }
    const prevValue = self2._input.value;
    setHoursFromInputs();
    updateValue();
    if (self2._input.value !== prevValue) {
      self2._debouncedChange();
    }
  }
  function ampm2military(hour, amPM) {
    return hour % 12 + 12 * int(amPM === self2.l10n.amPM[1]);
  }
  function military2ampm(hour) {
    switch (hour % 24) {
      case 0:
      case 12:
        return 12;
      default:
        return hour % 12;
    }
  }
  function setHoursFromInputs() {
    if (self2.hourElement === void 0 || self2.minuteElement === void 0)
      return;
    let hours = (parseInt(self2.hourElement.value.slice(-2), 10) || 0) % 24, minutes = (parseInt(self2.minuteElement.value, 10) || 0) % 60, seconds = self2.secondElement !== void 0 ? (parseInt(self2.secondElement.value, 10) || 0) % 60 : 0;
    if (self2.amPM !== void 0) {
      hours = ampm2military(hours, self2.amPM.textContent);
    }
    const limitMinHours = self2.config.minTime !== void 0 || self2.config.minDate && self2.minDateHasTime && self2.latestSelectedDateObj && compareDates(self2.latestSelectedDateObj, self2.config.minDate, true) === 0;
    const limitMaxHours = self2.config.maxTime !== void 0 || self2.config.maxDate && self2.maxDateHasTime && self2.latestSelectedDateObj && compareDates(self2.latestSelectedDateObj, self2.config.maxDate, true) === 0;
    if (limitMaxHours) {
      const maxTime = self2.config.maxTime !== void 0 ? self2.config.maxTime : self2.config.maxDate;
      hours = Math.min(hours, maxTime.getHours());
      if (hours === maxTime.getHours())
        minutes = Math.min(minutes, maxTime.getMinutes());
      if (minutes === maxTime.getMinutes())
        seconds = Math.min(seconds, maxTime.getSeconds());
    }
    if (limitMinHours) {
      const minTime = self2.config.minTime !== void 0 ? self2.config.minTime : self2.config.minDate;
      hours = Math.max(hours, minTime.getHours());
      if (hours === minTime.getHours() && minutes < minTime.getMinutes())
        minutes = minTime.getMinutes();
      if (minutes === minTime.getMinutes())
        seconds = Math.max(seconds, minTime.getSeconds());
    }
    setHours(hours, minutes, seconds);
  }
  function setHoursFromDate(dateObj) {
    const date = dateObj || self2.latestSelectedDateObj;
    if (date) {
      setHours(date.getHours(), date.getMinutes(), date.getSeconds());
    }
  }
  function setHours(hours, minutes, seconds) {
    if (self2.latestSelectedDateObj !== void 0) {
      self2.latestSelectedDateObj.setHours(hours % 24, minutes, seconds || 0, 0);
    }
    if (!self2.hourElement || !self2.minuteElement || self2.isMobile)
      return;
    self2.hourElement.value = pad(!self2.config.time_24hr ? (12 + hours) % 12 + 12 * int(hours % 12 === 0) : hours);
    self2.minuteElement.value = pad(minutes);
    if (self2.amPM !== void 0)
      self2.amPM.textContent = self2.l10n.amPM[int(hours >= 12)];
    if (self2.secondElement !== void 0)
      self2.secondElement.value = pad(seconds);
  }
  function onYearInput(event) {
    const eventTarget = getEventTarget(event);
    const year = parseInt(eventTarget.value) + (event.delta || 0);
    if (year / 1e3 > 1 || event.key === "Enter" && !/[^\d]/.test(year.toString())) {
      changeYear(year);
    }
  }
  function bind(element2, event, handler2, options22) {
    if (event instanceof Array)
      return event.forEach((ev) => bind(element2, ev, handler2, options22));
    if (element2 instanceof Array)
      return element2.forEach((el) => bind(el, event, handler2, options22));
    element2.addEventListener(event, handler2, options22);
    self2._handlers.push({
      remove: () => element2.removeEventListener(event, handler2)
    });
  }
  function triggerChange() {
    triggerEvent("onChange");
  }
  function bindEvents() {
    if (self2.config.wrap) {
      ["open", "close", "toggle", "clear"].forEach((evt) => {
        Array.prototype.forEach.call(self2.element.querySelectorAll(`[data-${evt}]`), (el) => bind(el, "click", self2[evt]));
      });
    }
    if (self2.isMobile) {
      setupMobile();
      return;
    }
    const debouncedResize = debounce$1(onResize, 50);
    self2._debouncedChange = debounce$1(triggerChange, DEBOUNCED_CHANGE_MS);
    if (self2.daysContainer && !/iPhone|iPad|iPod/i.test(navigator.userAgent))
      bind(self2.daysContainer, "mouseover", (e) => {
        if (self2.config.mode === "range")
          onMouseOver(getEventTarget(e));
      });
    bind(window.document.body, "keydown", onKeyDown);
    if (!self2.config.inline && !self2.config.static)
      bind(window, "resize", debouncedResize);
    if (window.ontouchstart !== void 0)
      bind(window.document, "touchstart", documentClick);
    else
      bind(window.document, "mousedown", documentClick);
    bind(window.document, "focus", documentClick, { capture: true });
    if (self2.config.clickOpens === true) {
      bind(self2._input, "focus", self2.open);
      bind(self2._input, "click", self2.open);
    }
    if (self2.daysContainer !== void 0) {
      bind(self2.monthNav, "click", onMonthNavClick);
      bind(self2.monthNav, ["keyup", "increment"], onYearInput);
      bind(self2.daysContainer, "click", selectDate);
    }
    if (self2.timeContainer !== void 0 && self2.minuteElement !== void 0 && self2.hourElement !== void 0) {
      const selText = (e) => getEventTarget(e).select();
      bind(self2.timeContainer, ["increment"], updateTime);
      bind(self2.timeContainer, "blur", updateTime, { capture: true });
      bind(self2.timeContainer, "click", timeIncrement);
      bind([self2.hourElement, self2.minuteElement], ["focus", "click"], selText);
      if (self2.secondElement !== void 0)
        bind(self2.secondElement, "focus", () => self2.secondElement && self2.secondElement.select());
      if (self2.amPM !== void 0) {
        bind(self2.amPM, "click", (e) => {
          updateTime(e);
          triggerChange();
        });
      }
    }
    if (self2.config.allowInput) {
      bind(self2._input, "blur", onBlur);
    }
  }
  function jumpToDate(jumpDate, triggerChange2) {
    const jumpTo = jumpDate !== void 0 ? self2.parseDate(jumpDate) : self2.latestSelectedDateObj || (self2.config.minDate && self2.config.minDate > self2.now ? self2.config.minDate : self2.config.maxDate && self2.config.maxDate < self2.now ? self2.config.maxDate : self2.now);
    const oldYear = self2.currentYear;
    const oldMonth = self2.currentMonth;
    try {
      if (jumpTo !== void 0) {
        self2.currentYear = jumpTo.getFullYear();
        self2.currentMonth = jumpTo.getMonth();
      }
    } catch (e) {
      e.message = "Invalid date supplied: " + jumpTo;
      self2.config.errorHandler(e);
    }
    if (triggerChange2 && self2.currentYear !== oldYear) {
      triggerEvent("onYearChange");
      buildMonthSwitch();
    }
    if (triggerChange2 && (self2.currentYear !== oldYear || self2.currentMonth !== oldMonth)) {
      triggerEvent("onMonthChange");
    }
    self2.redraw();
  }
  function timeIncrement(e) {
    const eventTarget = getEventTarget(e);
    if (~eventTarget.className.indexOf("arrow"))
      incrementNumInput(e, eventTarget.classList.contains("arrowUp") ? 1 : -1);
  }
  function incrementNumInput(e, delta, inputElem) {
    const target = e && getEventTarget(e);
    const input = inputElem || target && target.parentNode && target.parentNode.firstChild;
    const event = createEvent("increment");
    event.delta = delta;
    input && input.dispatchEvent(event);
  }
  function build() {
    const fragment = window.document.createDocumentFragment();
    self2.calendarContainer = createElement("div", "flatpickr-calendar");
    self2.calendarContainer.tabIndex = -1;
    if (!self2.config.noCalendar) {
      fragment.appendChild(buildMonthNav());
      self2.innerContainer = createElement("div", "flatpickr-innerContainer");
      if (self2.config.weekNumbers) {
        const { weekWrapper, weekNumbers } = buildWeeks();
        self2.innerContainer.appendChild(weekWrapper);
        self2.weekNumbers = weekNumbers;
        self2.weekWrapper = weekWrapper;
      }
      self2.rContainer = createElement("div", "flatpickr-rContainer");
      self2.rContainer.appendChild(buildWeekdays());
      if (!self2.daysContainer) {
        self2.daysContainer = createElement("div", "flatpickr-days");
        self2.daysContainer.tabIndex = -1;
      }
      buildDays();
      self2.rContainer.appendChild(self2.daysContainer);
      self2.innerContainer.appendChild(self2.rContainer);
      fragment.appendChild(self2.innerContainer);
    }
    if (self2.config.enableTime) {
      fragment.appendChild(buildTime());
    }
    toggleClass(self2.calendarContainer, "rangeMode", self2.config.mode === "range");
    toggleClass(self2.calendarContainer, "animate", self2.config.animate === true);
    toggleClass(self2.calendarContainer, "multiMonth", self2.config.showMonths > 1);
    self2.calendarContainer.appendChild(fragment);
    const customAppend = self2.config.appendTo !== void 0 && self2.config.appendTo.nodeType !== void 0;
    if (self2.config.inline || self2.config.static) {
      self2.calendarContainer.classList.add(self2.config.inline ? "inline" : "static");
      if (self2.config.inline) {
        if (!customAppend && self2.element.parentNode)
          self2.element.parentNode.insertBefore(self2.calendarContainer, self2._input.nextSibling);
        else if (self2.config.appendTo !== void 0)
          self2.config.appendTo.appendChild(self2.calendarContainer);
      }
      if (self2.config.static) {
        const wrapper = createElement("div", "flatpickr-wrapper");
        if (self2.element.parentNode)
          self2.element.parentNode.insertBefore(wrapper, self2.element);
        wrapper.appendChild(self2.element);
        if (self2.altInput)
          wrapper.appendChild(self2.altInput);
        wrapper.appendChild(self2.calendarContainer);
      }
    }
    if (!self2.config.static && !self2.config.inline)
      (self2.config.appendTo !== void 0 ? self2.config.appendTo : window.document.body).appendChild(self2.calendarContainer);
  }
  function createDay(className, date, dayNumber, i) {
    const dateIsEnabled = isEnabled(date, true), dayElement = createElement("span", "flatpickr-day " + className, date.getDate().toString());
    dayElement.dateObj = date;
    dayElement.$i = i;
    dayElement.setAttribute("aria-label", self2.formatDate(date, self2.config.ariaDateFormat));
    if (className.indexOf("hidden") === -1 && compareDates(date, self2.now) === 0) {
      self2.todayDateElem = dayElement;
      dayElement.classList.add("today");
      dayElement.setAttribute("aria-current", "date");
    }
    if (dateIsEnabled) {
      dayElement.tabIndex = -1;
      if (isDateSelected(date)) {
        dayElement.classList.add("selected");
        self2.selectedDateElem = dayElement;
        if (self2.config.mode === "range") {
          toggleClass(dayElement, "startRange", self2.selectedDates[0] && compareDates(date, self2.selectedDates[0], true) === 0);
          toggleClass(dayElement, "endRange", self2.selectedDates[1] && compareDates(date, self2.selectedDates[1], true) === 0);
          if (className === "nextMonthDay")
            dayElement.classList.add("inRange");
        }
      }
    } else {
      dayElement.classList.add("flatpickr-disabled");
    }
    if (self2.config.mode === "range") {
      if (isDateInRange(date) && !isDateSelected(date))
        dayElement.classList.add("inRange");
    }
    if (self2.weekNumbers && self2.config.showMonths === 1 && className !== "prevMonthDay" && dayNumber % 7 === 1) {
      self2.weekNumbers.insertAdjacentHTML("beforeend", "<span class='flatpickr-day'>" + self2.config.getWeek(date) + "</span>");
    }
    triggerEvent("onDayCreate", dayElement);
    return dayElement;
  }
  function focusOnDayElem(targetNode) {
    targetNode.focus();
    if (self2.config.mode === "range")
      onMouseOver(targetNode);
  }
  function getFirstAvailableDay(delta) {
    const startMonth = delta > 0 ? 0 : self2.config.showMonths - 1;
    const endMonth = delta > 0 ? self2.config.showMonths : -1;
    for (let m = startMonth; m != endMonth; m += delta) {
      const month = self2.daysContainer.children[m];
      const startIndex = delta > 0 ? 0 : month.children.length - 1;
      const endIndex = delta > 0 ? month.children.length : -1;
      for (let i = startIndex; i != endIndex; i += delta) {
        const c = month.children[i];
        if (c.className.indexOf("hidden") === -1 && isEnabled(c.dateObj))
          return c;
      }
    }
    return void 0;
  }
  function getNextAvailableDay(current, delta) {
    const givenMonth = current.className.indexOf("Month") === -1 ? current.dateObj.getMonth() : self2.currentMonth;
    const endMonth = delta > 0 ? self2.config.showMonths : -1;
    const loopDelta = delta > 0 ? 1 : -1;
    for (let m = givenMonth - self2.currentMonth; m != endMonth; m += loopDelta) {
      const month = self2.daysContainer.children[m];
      const startIndex = givenMonth - self2.currentMonth === m ? current.$i + delta : delta < 0 ? month.children.length - 1 : 0;
      const numMonthDays = month.children.length;
      for (let i = startIndex; i >= 0 && i < numMonthDays && i != (delta > 0 ? numMonthDays : -1); i += loopDelta) {
        const c = month.children[i];
        if (c.className.indexOf("hidden") === -1 && isEnabled(c.dateObj) && Math.abs(current.$i - i) >= Math.abs(delta))
          return focusOnDayElem(c);
      }
    }
    self2.changeMonth(loopDelta);
    focusOnDay(getFirstAvailableDay(loopDelta), 0);
    return void 0;
  }
  function focusOnDay(current, offset) {
    const dayFocused = isInView(document.activeElement || document.body);
    const startElem = current !== void 0 ? current : dayFocused ? document.activeElement : self2.selectedDateElem !== void 0 && isInView(self2.selectedDateElem) ? self2.selectedDateElem : self2.todayDateElem !== void 0 && isInView(self2.todayDateElem) ? self2.todayDateElem : getFirstAvailableDay(offset > 0 ? 1 : -1);
    if (startElem === void 0) {
      self2._input.focus();
    } else if (!dayFocused) {
      focusOnDayElem(startElem);
    } else {
      getNextAvailableDay(startElem, offset);
    }
  }
  function buildMonthDays(year, month) {
    const firstOfMonth = (new Date(year, month, 1).getDay() - self2.l10n.firstDayOfWeek + 7) % 7;
    const prevMonthDays = self2.utils.getDaysInMonth((month - 1 + 12) % 12, year);
    const daysInMonth = self2.utils.getDaysInMonth(month, year), days = window.document.createDocumentFragment(), isMultiMonth = self2.config.showMonths > 1, prevMonthDayClass = isMultiMonth ? "prevMonthDay hidden" : "prevMonthDay", nextMonthDayClass = isMultiMonth ? "nextMonthDay hidden" : "nextMonthDay";
    let dayNumber = prevMonthDays + 1 - firstOfMonth, dayIndex = 0;
    for (; dayNumber <= prevMonthDays; dayNumber++, dayIndex++) {
      days.appendChild(createDay(prevMonthDayClass, new Date(year, month - 1, dayNumber), dayNumber, dayIndex));
    }
    for (dayNumber = 1; dayNumber <= daysInMonth; dayNumber++, dayIndex++) {
      days.appendChild(createDay("", new Date(year, month, dayNumber), dayNumber, dayIndex));
    }
    for (let dayNum = daysInMonth + 1; dayNum <= 42 - firstOfMonth && (self2.config.showMonths === 1 || dayIndex % 7 !== 0); dayNum++, dayIndex++) {
      days.appendChild(createDay(nextMonthDayClass, new Date(year, month + 1, dayNum % daysInMonth), dayNum, dayIndex));
    }
    const dayContainer = createElement("div", "dayContainer");
    dayContainer.appendChild(days);
    return dayContainer;
  }
  function buildDays() {
    if (self2.daysContainer === void 0) {
      return;
    }
    clearNode(self2.daysContainer);
    if (self2.weekNumbers)
      clearNode(self2.weekNumbers);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < self2.config.showMonths; i++) {
      const d2 = new Date(self2.currentYear, self2.currentMonth, 1);
      d2.setMonth(self2.currentMonth + i);
      frag.appendChild(buildMonthDays(d2.getFullYear(), d2.getMonth()));
    }
    self2.daysContainer.appendChild(frag);
    self2.days = self2.daysContainer.firstChild;
    if (self2.config.mode === "range" && self2.selectedDates.length === 1) {
      onMouseOver();
    }
  }
  function buildMonthSwitch() {
    if (self2.config.showMonths > 1 || self2.config.monthSelectorType !== "dropdown")
      return;
    const shouldBuildMonth = function(month) {
      if (self2.config.minDate !== void 0 && self2.currentYear === self2.config.minDate.getFullYear() && month < self2.config.minDate.getMonth()) {
        return false;
      }
      return !(self2.config.maxDate !== void 0 && self2.currentYear === self2.config.maxDate.getFullYear() && month > self2.config.maxDate.getMonth());
    };
    self2.monthsDropdownContainer.tabIndex = -1;
    self2.monthsDropdownContainer.innerHTML = "";
    for (let i = 0; i < 12; i++) {
      if (!shouldBuildMonth(i))
        continue;
      const month = createElement("option", "flatpickr-monthDropdown-month");
      month.value = new Date(self2.currentYear, i).getMonth().toString();
      month.textContent = monthToStr(i, self2.config.shorthandCurrentMonth, self2.l10n);
      month.tabIndex = -1;
      if (self2.currentMonth === i) {
        month.selected = true;
      }
      self2.monthsDropdownContainer.appendChild(month);
    }
  }
  function buildMonth() {
    const container = createElement("div", "flatpickr-month");
    const monthNavFragment = window.document.createDocumentFragment();
    let monthElement;
    if (self2.config.showMonths > 1 || self2.config.monthSelectorType === "static") {
      monthElement = createElement("span", "cur-month");
    } else {
      self2.monthsDropdownContainer = createElement("select", "flatpickr-monthDropdown-months");
      self2.monthsDropdownContainer.setAttribute("aria-label", self2.l10n.monthAriaLabel);
      bind(self2.monthsDropdownContainer, "change", (e) => {
        const target = getEventTarget(e);
        const selectedMonth = parseInt(target.value, 10);
        self2.changeMonth(selectedMonth - self2.currentMonth);
        triggerEvent("onMonthChange");
      });
      buildMonthSwitch();
      monthElement = self2.monthsDropdownContainer;
    }
    const yearInput = createNumberInput("cur-year", { tabindex: "-1" });
    const yearElement = yearInput.getElementsByTagName("input")[0];
    yearElement.setAttribute("aria-label", self2.l10n.yearAriaLabel);
    if (self2.config.minDate) {
      yearElement.setAttribute("min", self2.config.minDate.getFullYear().toString());
    }
    if (self2.config.maxDate) {
      yearElement.setAttribute("max", self2.config.maxDate.getFullYear().toString());
      yearElement.disabled = !!self2.config.minDate && self2.config.minDate.getFullYear() === self2.config.maxDate.getFullYear();
    }
    const currentMonth = createElement("div", "flatpickr-current-month");
    currentMonth.appendChild(monthElement);
    currentMonth.appendChild(yearInput);
    monthNavFragment.appendChild(currentMonth);
    container.appendChild(monthNavFragment);
    return {
      container,
      yearElement,
      monthElement
    };
  }
  function buildMonths() {
    clearNode(self2.monthNav);
    self2.monthNav.appendChild(self2.prevMonthNav);
    if (self2.config.showMonths) {
      self2.yearElements = [];
      self2.monthElements = [];
    }
    for (let m = self2.config.showMonths; m--; ) {
      const month = buildMonth();
      self2.yearElements.push(month.yearElement);
      self2.monthElements.push(month.monthElement);
      self2.monthNav.appendChild(month.container);
    }
    self2.monthNav.appendChild(self2.nextMonthNav);
  }
  function buildMonthNav() {
    self2.monthNav = createElement("div", "flatpickr-months");
    self2.yearElements = [];
    self2.monthElements = [];
    self2.prevMonthNav = createElement("span", "flatpickr-prev-month");
    self2.prevMonthNav.innerHTML = self2.config.prevArrow;
    self2.nextMonthNav = createElement("span", "flatpickr-next-month");
    self2.nextMonthNav.innerHTML = self2.config.nextArrow;
    buildMonths();
    Object.defineProperty(self2, "_hidePrevMonthArrow", {
      get: () => self2.__hidePrevMonthArrow,
      set(bool) {
        if (self2.__hidePrevMonthArrow !== bool) {
          toggleClass(self2.prevMonthNav, "flatpickr-disabled", bool);
          self2.__hidePrevMonthArrow = bool;
        }
      }
    });
    Object.defineProperty(self2, "_hideNextMonthArrow", {
      get: () => self2.__hideNextMonthArrow,
      set(bool) {
        if (self2.__hideNextMonthArrow !== bool) {
          toggleClass(self2.nextMonthNav, "flatpickr-disabled", bool);
          self2.__hideNextMonthArrow = bool;
        }
      }
    });
    self2.currentYearElement = self2.yearElements[0];
    updateNavigationCurrentMonth();
    return self2.monthNav;
  }
  function buildTime() {
    self2.calendarContainer.classList.add("hasTime");
    if (self2.config.noCalendar)
      self2.calendarContainer.classList.add("noCalendar");
    const defaults2 = getDefaultHours(self2.config);
    self2.timeContainer = createElement("div", "flatpickr-time");
    self2.timeContainer.tabIndex = -1;
    const separator = createElement("span", "flatpickr-time-separator", ":");
    const hourInput = createNumberInput("flatpickr-hour", {
      "aria-label": self2.l10n.hourAriaLabel
    });
    self2.hourElement = hourInput.getElementsByTagName("input")[0];
    const minuteInput = createNumberInput("flatpickr-minute", {
      "aria-label": self2.l10n.minuteAriaLabel
    });
    self2.minuteElement = minuteInput.getElementsByTagName("input")[0];
    self2.hourElement.tabIndex = self2.minuteElement.tabIndex = -1;
    self2.hourElement.value = pad(self2.latestSelectedDateObj ? self2.latestSelectedDateObj.getHours() : self2.config.time_24hr ? defaults2.hours : military2ampm(defaults2.hours));
    self2.minuteElement.value = pad(self2.latestSelectedDateObj ? self2.latestSelectedDateObj.getMinutes() : defaults2.minutes);
    self2.hourElement.setAttribute("step", self2.config.hourIncrement.toString());
    self2.minuteElement.setAttribute("step", self2.config.minuteIncrement.toString());
    self2.hourElement.setAttribute("min", self2.config.time_24hr ? "0" : "1");
    self2.hourElement.setAttribute("max", self2.config.time_24hr ? "23" : "12");
    self2.hourElement.setAttribute("maxlength", "2");
    self2.minuteElement.setAttribute("min", "0");
    self2.minuteElement.setAttribute("max", "59");
    self2.minuteElement.setAttribute("maxlength", "2");
    self2.timeContainer.appendChild(hourInput);
    self2.timeContainer.appendChild(separator);
    self2.timeContainer.appendChild(minuteInput);
    if (self2.config.time_24hr)
      self2.timeContainer.classList.add("time24hr");
    if (self2.config.enableSeconds) {
      self2.timeContainer.classList.add("hasSeconds");
      const secondInput = createNumberInput("flatpickr-second");
      self2.secondElement = secondInput.getElementsByTagName("input")[0];
      self2.secondElement.value = pad(self2.latestSelectedDateObj ? self2.latestSelectedDateObj.getSeconds() : defaults2.seconds);
      self2.secondElement.setAttribute("step", self2.minuteElement.getAttribute("step"));
      self2.secondElement.setAttribute("min", "0");
      self2.secondElement.setAttribute("max", "59");
      self2.secondElement.setAttribute("maxlength", "2");
      self2.timeContainer.appendChild(createElement("span", "flatpickr-time-separator", ":"));
      self2.timeContainer.appendChild(secondInput);
    }
    if (!self2.config.time_24hr) {
      self2.amPM = createElement("span", "flatpickr-am-pm", self2.l10n.amPM[int((self2.latestSelectedDateObj ? self2.hourElement.value : self2.config.defaultHour) > 11)]);
      self2.amPM.title = self2.l10n.toggleTitle;
      self2.amPM.tabIndex = -1;
      self2.timeContainer.appendChild(self2.amPM);
    }
    return self2.timeContainer;
  }
  function buildWeekdays() {
    if (!self2.weekdayContainer)
      self2.weekdayContainer = createElement("div", "flatpickr-weekdays");
    else
      clearNode(self2.weekdayContainer);
    for (let i = self2.config.showMonths; i--; ) {
      const container = createElement("div", "flatpickr-weekdaycontainer");
      self2.weekdayContainer.appendChild(container);
    }
    updateWeekdays();
    return self2.weekdayContainer;
  }
  function updateWeekdays() {
    if (!self2.weekdayContainer) {
      return;
    }
    const firstDayOfWeek = self2.l10n.firstDayOfWeek;
    let weekdays = [...self2.l10n.weekdays.shorthand];
    if (firstDayOfWeek > 0 && firstDayOfWeek < weekdays.length) {
      weekdays = [
        ...weekdays.splice(firstDayOfWeek, weekdays.length),
        ...weekdays.splice(0, firstDayOfWeek)
      ];
    }
    for (let i = self2.config.showMonths; i--; ) {
      self2.weekdayContainer.children[i].innerHTML = `
      <span class='flatpickr-weekday'>
        ${weekdays.join("</span><span class='flatpickr-weekday'>")}
      </span>
      `;
    }
  }
  function buildWeeks() {
    self2.calendarContainer.classList.add("hasWeeks");
    const weekWrapper = createElement("div", "flatpickr-weekwrapper");
    weekWrapper.appendChild(createElement("span", "flatpickr-weekday", self2.l10n.weekAbbreviation));
    const weekNumbers = createElement("div", "flatpickr-weeks");
    weekWrapper.appendChild(weekNumbers);
    return {
      weekWrapper,
      weekNumbers
    };
  }
  function changeMonth(value, isOffset = true) {
    const delta = isOffset ? value : value - self2.currentMonth;
    if (delta < 0 && self2._hidePrevMonthArrow === true || delta > 0 && self2._hideNextMonthArrow === true)
      return;
    self2.currentMonth += delta;
    if (self2.currentMonth < 0 || self2.currentMonth > 11) {
      self2.currentYear += self2.currentMonth > 11 ? 1 : -1;
      self2.currentMonth = (self2.currentMonth + 12) % 12;
      triggerEvent("onYearChange");
      buildMonthSwitch();
    }
    buildDays();
    triggerEvent("onMonthChange");
    updateNavigationCurrentMonth();
  }
  function clear(triggerChangeEvent = true, toInitial = true) {
    self2.input.value = "";
    if (self2.altInput !== void 0)
      self2.altInput.value = "";
    if (self2.mobileInput !== void 0)
      self2.mobileInput.value = "";
    self2.selectedDates = [];
    self2.latestSelectedDateObj = void 0;
    if (toInitial === true) {
      self2.currentYear = self2._initialDate.getFullYear();
      self2.currentMonth = self2._initialDate.getMonth();
    }
    if (self2.config.enableTime === true) {
      const { hours, minutes, seconds } = getDefaultHours(self2.config);
      setHours(hours, minutes, seconds);
    }
    self2.redraw();
    if (triggerChangeEvent)
      triggerEvent("onChange");
  }
  function close() {
    self2.isOpen = false;
    if (!self2.isMobile) {
      if (self2.calendarContainer !== void 0) {
        self2.calendarContainer.classList.remove("open");
      }
      if (self2._input !== void 0) {
        self2._input.classList.remove("active");
      }
    }
    triggerEvent("onClose");
  }
  function destroy() {
    if (self2.config !== void 0)
      triggerEvent("onDestroy");
    for (let i = self2._handlers.length; i--; ) {
      self2._handlers[i].remove();
    }
    self2._handlers = [];
    if (self2.mobileInput) {
      if (self2.mobileInput.parentNode)
        self2.mobileInput.parentNode.removeChild(self2.mobileInput);
      self2.mobileInput = void 0;
    } else if (self2.calendarContainer && self2.calendarContainer.parentNode) {
      if (self2.config.static && self2.calendarContainer.parentNode) {
        const wrapper = self2.calendarContainer.parentNode;
        wrapper.lastChild && wrapper.removeChild(wrapper.lastChild);
        if (wrapper.parentNode) {
          while (wrapper.firstChild)
            wrapper.parentNode.insertBefore(wrapper.firstChild, wrapper);
          wrapper.parentNode.removeChild(wrapper);
        }
      } else
        self2.calendarContainer.parentNode.removeChild(self2.calendarContainer);
    }
    if (self2.altInput) {
      self2.input.type = "text";
      if (self2.altInput.parentNode)
        self2.altInput.parentNode.removeChild(self2.altInput);
      delete self2.altInput;
    }
    if (self2.input) {
      self2.input.type = self2.input._type;
      self2.input.classList.remove("flatpickr-input");
      self2.input.removeAttribute("readonly");
    }
    [
      "_showTimeInput",
      "latestSelectedDateObj",
      "_hideNextMonthArrow",
      "_hidePrevMonthArrow",
      "__hideNextMonthArrow",
      "__hidePrevMonthArrow",
      "isMobile",
      "isOpen",
      "selectedDateElem",
      "minDateHasTime",
      "maxDateHasTime",
      "days",
      "daysContainer",
      "_input",
      "_positionElement",
      "innerContainer",
      "rContainer",
      "monthNav",
      "todayDateElem",
      "calendarContainer",
      "weekdayContainer",
      "prevMonthNav",
      "nextMonthNav",
      "monthsDropdownContainer",
      "currentMonthElement",
      "currentYearElement",
      "navigationCurrentMonth",
      "selectedDateElem",
      "config"
    ].forEach((k) => {
      try {
        delete self2[k];
      } catch (_) {
      }
    });
  }
  function isCalendarElem(elem) {
    if (self2.config.appendTo && self2.config.appendTo.contains(elem))
      return true;
    return self2.calendarContainer.contains(elem);
  }
  function documentClick(e) {
    if (self2.isOpen && !self2.config.inline) {
      const eventTarget = getEventTarget(e);
      const isCalendarElement = isCalendarElem(eventTarget);
      const isInput = eventTarget === self2.input || eventTarget === self2.altInput || self2.element.contains(eventTarget) || e.path && e.path.indexOf && (~e.path.indexOf(self2.input) || ~e.path.indexOf(self2.altInput));
      const lostFocus = e.type === "blur" ? isInput && e.relatedTarget && !isCalendarElem(e.relatedTarget) : !isInput && !isCalendarElement && !isCalendarElem(e.relatedTarget);
      const isIgnored = !self2.config.ignoredFocusElements.some((elem) => elem.contains(eventTarget));
      if (lostFocus && isIgnored) {
        if (self2.timeContainer !== void 0 && self2.minuteElement !== void 0 && self2.hourElement !== void 0 && self2.input.value !== "" && self2.input.value !== void 0) {
          updateTime();
        }
        self2.close();
        if (self2.config && self2.config.mode === "range" && self2.selectedDates.length === 1) {
          self2.clear(false);
          self2.redraw();
        }
      }
    }
  }
  function changeYear(newYear) {
    if (!newYear || self2.config.minDate && newYear < self2.config.minDate.getFullYear() || self2.config.maxDate && newYear > self2.config.maxDate.getFullYear())
      return;
    const newYearNum = newYear, isNewYear = self2.currentYear !== newYearNum;
    self2.currentYear = newYearNum || self2.currentYear;
    if (self2.config.maxDate && self2.currentYear === self2.config.maxDate.getFullYear()) {
      self2.currentMonth = Math.min(self2.config.maxDate.getMonth(), self2.currentMonth);
    } else if (self2.config.minDate && self2.currentYear === self2.config.minDate.getFullYear()) {
      self2.currentMonth = Math.max(self2.config.minDate.getMonth(), self2.currentMonth);
    }
    if (isNewYear) {
      self2.redraw();
      triggerEvent("onYearChange");
      buildMonthSwitch();
    }
  }
  function isEnabled(date, timeless = true) {
    var _a;
    const dateToCheck = self2.parseDate(date, void 0, timeless);
    if (self2.config.minDate && dateToCheck && compareDates(dateToCheck, self2.config.minDate, timeless !== void 0 ? timeless : !self2.minDateHasTime) < 0 || self2.config.maxDate && dateToCheck && compareDates(dateToCheck, self2.config.maxDate, timeless !== void 0 ? timeless : !self2.maxDateHasTime) > 0)
      return false;
    if (!self2.config.enable && self2.config.disable.length === 0)
      return true;
    if (dateToCheck === void 0)
      return false;
    const bool = !!self2.config.enable, array = (_a = self2.config.enable) !== null && _a !== void 0 ? _a : self2.config.disable;
    for (let i = 0, d2; i < array.length; i++) {
      d2 = array[i];
      if (typeof d2 === "function" && d2(dateToCheck))
        return bool;
      else if (d2 instanceof Date && dateToCheck !== void 0 && d2.getTime() === dateToCheck.getTime())
        return bool;
      else if (typeof d2 === "string") {
        const parsed = self2.parseDate(d2, void 0, true);
        return parsed && parsed.getTime() === dateToCheck.getTime() ? bool : !bool;
      } else if (typeof d2 === "object" && dateToCheck !== void 0 && d2.from && d2.to && dateToCheck.getTime() >= d2.from.getTime() && dateToCheck.getTime() <= d2.to.getTime())
        return bool;
    }
    return !bool;
  }
  function isInView(elem) {
    if (self2.daysContainer !== void 0)
      return elem.className.indexOf("hidden") === -1 && elem.className.indexOf("flatpickr-disabled") === -1 && self2.daysContainer.contains(elem);
    return false;
  }
  function onBlur(e) {
    const isInput = e.target === self2._input;
    if (isInput && (self2.selectedDates.length > 0 || self2._input.value.length > 0) && !(e.relatedTarget && isCalendarElem(e.relatedTarget))) {
      self2.setDate(self2._input.value, true, e.target === self2.altInput ? self2.config.altFormat : self2.config.dateFormat);
    }
  }
  function onKeyDown(e) {
    const eventTarget = getEventTarget(e);
    const isInput = self2.config.wrap ? element.contains(eventTarget) : eventTarget === self2._input;
    const allowInput = self2.config.allowInput;
    const allowKeydown = self2.isOpen && (!allowInput || !isInput);
    const allowInlineKeydown = self2.config.inline && isInput && !allowInput;
    if (e.keyCode === 13 && isInput) {
      if (allowInput) {
        self2.setDate(self2._input.value, true, eventTarget === self2.altInput ? self2.config.altFormat : self2.config.dateFormat);
        return eventTarget.blur();
      } else {
        self2.open();
      }
    } else if (isCalendarElem(eventTarget) || allowKeydown || allowInlineKeydown) {
      const isTimeObj = !!self2.timeContainer && self2.timeContainer.contains(eventTarget);
      switch (e.keyCode) {
        case 13:
          if (isTimeObj) {
            e.preventDefault();
            updateTime();
            focusAndClose();
          } else
            selectDate(e);
          break;
        case 27:
          e.preventDefault();
          focusAndClose();
          break;
        case 8:
        case 46:
          if (isInput && !self2.config.allowInput) {
            e.preventDefault();
            self2.clear();
          }
          break;
        case 37:
        case 39:
          if (!isTimeObj && !isInput) {
            e.preventDefault();
            if (self2.daysContainer !== void 0 && (allowInput === false || document.activeElement && isInView(document.activeElement))) {
              const delta2 = e.keyCode === 39 ? 1 : -1;
              if (!e.ctrlKey)
                focusOnDay(void 0, delta2);
              else {
                e.stopPropagation();
                changeMonth(delta2);
                focusOnDay(getFirstAvailableDay(1), 0);
              }
            }
          } else if (self2.hourElement)
            self2.hourElement.focus();
          break;
        case 38:
        case 40:
          e.preventDefault();
          const delta = e.keyCode === 40 ? 1 : -1;
          if (self2.daysContainer && eventTarget.$i !== void 0 || eventTarget === self2.input || eventTarget === self2.altInput) {
            if (e.ctrlKey) {
              e.stopPropagation();
              changeYear(self2.currentYear - delta);
              focusOnDay(getFirstAvailableDay(1), 0);
            } else if (!isTimeObj)
              focusOnDay(void 0, delta * 7);
          } else if (eventTarget === self2.currentYearElement) {
            changeYear(self2.currentYear - delta);
          } else if (self2.config.enableTime) {
            if (!isTimeObj && self2.hourElement)
              self2.hourElement.focus();
            updateTime(e);
            self2._debouncedChange();
          }
          break;
        case 9:
          if (isTimeObj) {
            const elems = [
              self2.hourElement,
              self2.minuteElement,
              self2.secondElement,
              self2.amPM
            ].concat(self2.pluginElements).filter((x) => x);
            const i = elems.indexOf(eventTarget);
            if (i !== -1) {
              const target = elems[i + (e.shiftKey ? -1 : 1)];
              e.preventDefault();
              (target || self2._input).focus();
            }
          } else if (!self2.config.noCalendar && self2.daysContainer && self2.daysContainer.contains(eventTarget) && e.shiftKey) {
            e.preventDefault();
            self2._input.focus();
          }
          break;
      }
    }
    if (self2.amPM !== void 0 && eventTarget === self2.amPM) {
      switch (e.key) {
        case self2.l10n.amPM[0].charAt(0):
        case self2.l10n.amPM[0].charAt(0).toLowerCase():
          self2.amPM.textContent = self2.l10n.amPM[0];
          setHoursFromInputs();
          updateValue();
          break;
        case self2.l10n.amPM[1].charAt(0):
        case self2.l10n.amPM[1].charAt(0).toLowerCase():
          self2.amPM.textContent = self2.l10n.amPM[1];
          setHoursFromInputs();
          updateValue();
          break;
      }
    }
    if (isInput || isCalendarElem(eventTarget)) {
      triggerEvent("onKeyDown", e);
    }
  }
  function onMouseOver(elem) {
    if (self2.selectedDates.length !== 1 || elem && (!elem.classList.contains("flatpickr-day") || elem.classList.contains("flatpickr-disabled")))
      return;
    const hoverDate = elem ? elem.dateObj.getTime() : self2.days.firstElementChild.dateObj.getTime(), initialDate = self2.parseDate(self2.selectedDates[0], void 0, true).getTime(), rangeStartDate = Math.min(hoverDate, self2.selectedDates[0].getTime()), rangeEndDate = Math.max(hoverDate, self2.selectedDates[0].getTime());
    let containsDisabled = false;
    let minRange = 0, maxRange = 0;
    for (let t = rangeStartDate; t < rangeEndDate; t += duration.DAY) {
      if (!isEnabled(new Date(t), true)) {
        containsDisabled = containsDisabled || t > rangeStartDate && t < rangeEndDate;
        if (t < initialDate && (!minRange || t > minRange))
          minRange = t;
        else if (t > initialDate && (!maxRange || t < maxRange))
          maxRange = t;
      }
    }
    for (let m = 0; m < self2.config.showMonths; m++) {
      const month = self2.daysContainer.children[m];
      for (let i = 0, l = month.children.length; i < l; i++) {
        const dayElem = month.children[i], date = dayElem.dateObj;
        const timestamp = date.getTime();
        const outOfRange = minRange > 0 && timestamp < minRange || maxRange > 0 && timestamp > maxRange;
        if (outOfRange) {
          dayElem.classList.add("notAllowed");
          ["inRange", "startRange", "endRange"].forEach((c) => {
            dayElem.classList.remove(c);
          });
          continue;
        } else if (containsDisabled && !outOfRange)
          continue;
        ["startRange", "inRange", "endRange", "notAllowed"].forEach((c) => {
          dayElem.classList.remove(c);
        });
        if (elem !== void 0) {
          elem.classList.add(hoverDate <= self2.selectedDates[0].getTime() ? "startRange" : "endRange");
          if (initialDate < hoverDate && timestamp === initialDate)
            dayElem.classList.add("startRange");
          else if (initialDate > hoverDate && timestamp === initialDate)
            dayElem.classList.add("endRange");
          if (timestamp >= minRange && (maxRange === 0 || timestamp <= maxRange) && isBetween(timestamp, initialDate, hoverDate))
            dayElem.classList.add("inRange");
        }
      }
    }
  }
  function onResize() {
    if (self2.isOpen && !self2.config.static && !self2.config.inline)
      positionCalendar();
  }
  function open(e, positionElement = self2._positionElement) {
    if (self2.isMobile === true) {
      if (e) {
        e.preventDefault();
        const eventTarget = getEventTarget(e);
        if (eventTarget) {
          eventTarget.blur();
        }
      }
      if (self2.mobileInput !== void 0) {
        self2.mobileInput.focus();
        self2.mobileInput.click();
      }
      triggerEvent("onOpen");
      return;
    } else if (self2._input.disabled || self2.config.inline) {
      return;
    }
    const wasOpen = self2.isOpen;
    self2.isOpen = true;
    if (!wasOpen) {
      self2.calendarContainer.classList.add("open");
      self2._input.classList.add("active");
      triggerEvent("onOpen");
      positionCalendar(positionElement);
    }
    if (self2.config.enableTime === true && self2.config.noCalendar === true) {
      if (self2.config.allowInput === false && (e === void 0 || !self2.timeContainer.contains(e.relatedTarget))) {
        setTimeout(() => self2.hourElement.select(), 50);
      }
    }
  }
  function minMaxDateSetter(type) {
    return (date) => {
      const dateObj = self2.config[`_${type}Date`] = self2.parseDate(date, self2.config.dateFormat);
      const inverseDateObj = self2.config[`_${type === "min" ? "max" : "min"}Date`];
      if (dateObj !== void 0) {
        self2[type === "min" ? "minDateHasTime" : "maxDateHasTime"] = dateObj.getHours() > 0 || dateObj.getMinutes() > 0 || dateObj.getSeconds() > 0;
      }
      if (self2.selectedDates) {
        self2.selectedDates = self2.selectedDates.filter((d2) => isEnabled(d2));
        if (!self2.selectedDates.length && type === "min")
          setHoursFromDate(dateObj);
        updateValue();
      }
      if (self2.daysContainer) {
        redraw();
        if (dateObj !== void 0)
          self2.currentYearElement[type] = dateObj.getFullYear().toString();
        else
          self2.currentYearElement.removeAttribute(type);
        self2.currentYearElement.disabled = !!inverseDateObj && dateObj !== void 0 && inverseDateObj.getFullYear() === dateObj.getFullYear();
      }
    };
  }
  function parseConfig() {
    const boolOpts = [
      "wrap",
      "weekNumbers",
      "allowInput",
      "allowInvalidPreload",
      "clickOpens",
      "time_24hr",
      "enableTime",
      "noCalendar",
      "altInput",
      "shorthandCurrentMonth",
      "inline",
      "static",
      "enableSeconds",
      "disableMobile"
    ];
    const userConfig = Object.assign(Object.assign({}, JSON.parse(JSON.stringify(element.dataset || {}))), instanceConfig);
    const formats2 = {};
    self2.config.parseDate = userConfig.parseDate;
    self2.config.formatDate = userConfig.formatDate;
    Object.defineProperty(self2.config, "enable", {
      get: () => self2.config._enable,
      set: (dates) => {
        self2.config._enable = parseDateRules(dates);
      }
    });
    Object.defineProperty(self2.config, "disable", {
      get: () => self2.config._disable,
      set: (dates) => {
        self2.config._disable = parseDateRules(dates);
      }
    });
    const timeMode = userConfig.mode === "time";
    if (!userConfig.dateFormat && (userConfig.enableTime || timeMode)) {
      const defaultDateFormat = flatpickr$2.defaultConfig.dateFormat || defaults.dateFormat;
      formats2.dateFormat = userConfig.noCalendar || timeMode ? "H:i" + (userConfig.enableSeconds ? ":S" : "") : defaultDateFormat + " H:i" + (userConfig.enableSeconds ? ":S" : "");
    }
    if (userConfig.altInput && (userConfig.enableTime || timeMode) && !userConfig.altFormat) {
      const defaultAltFormat = flatpickr$2.defaultConfig.altFormat || defaults.altFormat;
      formats2.altFormat = userConfig.noCalendar || timeMode ? "h:i" + (userConfig.enableSeconds ? ":S K" : " K") : defaultAltFormat + ` h:i${userConfig.enableSeconds ? ":S" : ""} K`;
    }
    Object.defineProperty(self2.config, "minDate", {
      get: () => self2.config._minDate,
      set: minMaxDateSetter("min")
    });
    Object.defineProperty(self2.config, "maxDate", {
      get: () => self2.config._maxDate,
      set: minMaxDateSetter("max")
    });
    const minMaxTimeSetter = (type) => (val) => {
      self2.config[type === "min" ? "_minTime" : "_maxTime"] = self2.parseDate(val, "H:i:S");
    };
    Object.defineProperty(self2.config, "minTime", {
      get: () => self2.config._minTime,
      set: minMaxTimeSetter("min")
    });
    Object.defineProperty(self2.config, "maxTime", {
      get: () => self2.config._maxTime,
      set: minMaxTimeSetter("max")
    });
    if (userConfig.mode === "time") {
      self2.config.noCalendar = true;
      self2.config.enableTime = true;
    }
    Object.assign(self2.config, formats2, userConfig);
    for (let i = 0; i < boolOpts.length; i++)
      self2.config[boolOpts[i]] = self2.config[boolOpts[i]] === true || self2.config[boolOpts[i]] === "true";
    HOOKS.filter((hook) => self2.config[hook] !== void 0).forEach((hook) => {
      self2.config[hook] = arrayify(self2.config[hook] || []).map(bindToInstance);
    });
    self2.isMobile = !self2.config.disableMobile && !self2.config.inline && self2.config.mode === "single" && !self2.config.disable.length && !self2.config.enable && !self2.config.weekNumbers && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    for (let i = 0; i < self2.config.plugins.length; i++) {
      const pluginConf = self2.config.plugins[i](self2) || {};
      for (const key in pluginConf) {
        if (HOOKS.indexOf(key) > -1) {
          self2.config[key] = arrayify(pluginConf[key]).map(bindToInstance).concat(self2.config[key]);
        } else if (typeof userConfig[key] === "undefined")
          self2.config[key] = pluginConf[key];
      }
    }
    if (!userConfig.altInputClass) {
      self2.config.altInputClass = getInputElem().className + " " + self2.config.altInputClass;
    }
    triggerEvent("onParseConfig");
  }
  function getInputElem() {
    return self2.config.wrap ? element.querySelector("[data-input]") : element;
  }
  function setupLocale() {
    if (typeof self2.config.locale !== "object" && typeof flatpickr$2.l10ns[self2.config.locale] === "undefined")
      self2.config.errorHandler(new Error(`flatpickr: invalid locale ${self2.config.locale}`));
    self2.l10n = Object.assign(Object.assign({}, flatpickr$2.l10ns.default), typeof self2.config.locale === "object" ? self2.config.locale : self2.config.locale !== "default" ? flatpickr$2.l10ns[self2.config.locale] : void 0);
    tokenRegex.K = `(${self2.l10n.amPM[0]}|${self2.l10n.amPM[1]}|${self2.l10n.amPM[0].toLowerCase()}|${self2.l10n.amPM[1].toLowerCase()})`;
    const userConfig = Object.assign(Object.assign({}, instanceConfig), JSON.parse(JSON.stringify(element.dataset || {})));
    if (userConfig.time_24hr === void 0 && flatpickr$2.defaultConfig.time_24hr === void 0) {
      self2.config.time_24hr = self2.l10n.time_24hr;
    }
    self2.formatDate = createDateFormatter(self2);
    self2.parseDate = createDateParser({ config: self2.config, l10n: self2.l10n });
  }
  function positionCalendar(customPositionElement) {
    if (typeof self2.config.position === "function") {
      return void self2.config.position(self2, customPositionElement);
    }
    if (self2.calendarContainer === void 0)
      return;
    triggerEvent("onPreCalendarPosition");
    const positionElement = customPositionElement || self2._positionElement;
    const calendarHeight = Array.prototype.reduce.call(self2.calendarContainer.children, (acc, child) => acc + child.offsetHeight, 0), calendarWidth = self2.calendarContainer.offsetWidth, configPos = self2.config.position.split(" "), configPosVertical = configPos[0], configPosHorizontal = configPos.length > 1 ? configPos[1] : null, inputBounds = positionElement.getBoundingClientRect(), distanceFromBottom = window.innerHeight - inputBounds.bottom, showOnTop = configPosVertical === "above" || configPosVertical !== "below" && distanceFromBottom < calendarHeight && inputBounds.top > calendarHeight;
    const top = window.pageYOffset + inputBounds.top + (!showOnTop ? positionElement.offsetHeight + 2 : -calendarHeight - 2);
    toggleClass(self2.calendarContainer, "arrowTop", !showOnTop);
    toggleClass(self2.calendarContainer, "arrowBottom", showOnTop);
    if (self2.config.inline)
      return;
    let left = window.pageXOffset + inputBounds.left;
    let isCenter = false;
    let isRight = false;
    if (configPosHorizontal === "center") {
      left -= (calendarWidth - inputBounds.width) / 2;
      isCenter = true;
    } else if (configPosHorizontal === "right") {
      left -= calendarWidth - inputBounds.width;
      isRight = true;
    }
    toggleClass(self2.calendarContainer, "arrowLeft", !isCenter && !isRight);
    toggleClass(self2.calendarContainer, "arrowCenter", isCenter);
    toggleClass(self2.calendarContainer, "arrowRight", isRight);
    const right = window.document.body.offsetWidth - (window.pageXOffset + inputBounds.right);
    const rightMost = left + calendarWidth > window.document.body.offsetWidth;
    const centerMost = right + calendarWidth > window.document.body.offsetWidth;
    toggleClass(self2.calendarContainer, "rightMost", rightMost);
    if (self2.config.static)
      return;
    self2.calendarContainer.style.top = `${top}px`;
    if (!rightMost) {
      self2.calendarContainer.style.left = `${left}px`;
      self2.calendarContainer.style.right = "auto";
    } else if (!centerMost) {
      self2.calendarContainer.style.left = "auto";
      self2.calendarContainer.style.right = `${right}px`;
    } else {
      const doc = getDocumentStyleSheet();
      if (doc === void 0)
        return;
      const bodyWidth = window.document.body.offsetWidth;
      const centerLeft = Math.max(0, bodyWidth / 2 - calendarWidth / 2);
      const centerBefore = ".flatpickr-calendar.centerMost:before";
      const centerAfter = ".flatpickr-calendar.centerMost:after";
      const centerIndex = doc.cssRules.length;
      const centerStyle = `{left:${inputBounds.left}px;right:auto;}`;
      toggleClass(self2.calendarContainer, "rightMost", false);
      toggleClass(self2.calendarContainer, "centerMost", true);
      doc.insertRule(`${centerBefore},${centerAfter}${centerStyle}`, centerIndex);
      self2.calendarContainer.style.left = `${centerLeft}px`;
      self2.calendarContainer.style.right = "auto";
    }
  }
  function getDocumentStyleSheet() {
    let editableSheet = null;
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        sheet.cssRules;
      } catch (err) {
        continue;
      }
      editableSheet = sheet;
      break;
    }
    return editableSheet != null ? editableSheet : createStyleSheet();
  }
  function createStyleSheet() {
    const style = document.createElement("style");
    document.head.appendChild(style);
    return style.sheet;
  }
  function redraw() {
    if (self2.config.noCalendar || self2.isMobile)
      return;
    buildMonthSwitch();
    updateNavigationCurrentMonth();
    buildDays();
  }
  function focusAndClose() {
    self2._input.focus();
    if (window.navigator.userAgent.indexOf("MSIE") !== -1 || navigator.msMaxTouchPoints !== void 0) {
      setTimeout(self2.close, 0);
    } else {
      self2.close();
    }
  }
  function selectDate(e) {
    e.preventDefault();
    e.stopPropagation();
    const isSelectable = (day) => day.classList && day.classList.contains("flatpickr-day") && !day.classList.contains("flatpickr-disabled") && !day.classList.contains("notAllowed");
    const t = findParent(getEventTarget(e), isSelectable);
    if (t === void 0)
      return;
    const target = t;
    const selectedDate = self2.latestSelectedDateObj = new Date(target.dateObj.getTime());
    const shouldChangeMonth = (selectedDate.getMonth() < self2.currentMonth || selectedDate.getMonth() > self2.currentMonth + self2.config.showMonths - 1) && self2.config.mode !== "range";
    self2.selectedDateElem = target;
    if (self2.config.mode === "single")
      self2.selectedDates = [selectedDate];
    else if (self2.config.mode === "multiple") {
      const selectedIndex = isDateSelected(selectedDate);
      if (selectedIndex)
        self2.selectedDates.splice(parseInt(selectedIndex), 1);
      else
        self2.selectedDates.push(selectedDate);
    } else if (self2.config.mode === "range") {
      if (self2.selectedDates.length === 2) {
        self2.clear(false, false);
      }
      self2.latestSelectedDateObj = selectedDate;
      self2.selectedDates.push(selectedDate);
      if (compareDates(selectedDate, self2.selectedDates[0], true) !== 0)
        self2.selectedDates.sort((a, b) => a.getTime() - b.getTime());
    }
    setHoursFromInputs();
    if (shouldChangeMonth) {
      const isNewYear = self2.currentYear !== selectedDate.getFullYear();
      self2.currentYear = selectedDate.getFullYear();
      self2.currentMonth = selectedDate.getMonth();
      if (isNewYear) {
        triggerEvent("onYearChange");
        buildMonthSwitch();
      }
      triggerEvent("onMonthChange");
    }
    updateNavigationCurrentMonth();
    buildDays();
    updateValue();
    if (!shouldChangeMonth && self2.config.mode !== "range" && self2.config.showMonths === 1)
      focusOnDayElem(target);
    else if (self2.selectedDateElem !== void 0 && self2.hourElement === void 0) {
      self2.selectedDateElem && self2.selectedDateElem.focus();
    }
    if (self2.hourElement !== void 0)
      self2.hourElement !== void 0 && self2.hourElement.focus();
    if (self2.config.closeOnSelect) {
      const single = self2.config.mode === "single" && !self2.config.enableTime;
      const range = self2.config.mode === "range" && self2.selectedDates.length === 2 && !self2.config.enableTime;
      if (single || range) {
        focusAndClose();
      }
    }
    triggerChange();
  }
  const CALLBACKS = {
    locale: [setupLocale, updateWeekdays],
    showMonths: [buildMonths, setCalendarWidth, buildWeekdays],
    minDate: [jumpToDate],
    maxDate: [jumpToDate],
    clickOpens: [
      () => {
        if (self2.config.clickOpens === true) {
          bind(self2._input, "focus", self2.open);
          bind(self2._input, "click", self2.open);
        } else {
          self2._input.removeEventListener("focus", self2.open);
          self2._input.removeEventListener("click", self2.open);
        }
      }
    ]
  };
  function set(option, value) {
    if (option !== null && typeof option === "object") {
      Object.assign(self2.config, option);
      for (const key in option) {
        if (CALLBACKS[key] !== void 0)
          CALLBACKS[key].forEach((x) => x());
      }
    } else {
      self2.config[option] = value;
      if (CALLBACKS[option] !== void 0)
        CALLBACKS[option].forEach((x) => x());
      else if (HOOKS.indexOf(option) > -1)
        self2.config[option] = arrayify(value);
    }
    self2.redraw();
    updateValue(true);
  }
  function setSelectedDate(inputDate, format22) {
    let dates = [];
    if (inputDate instanceof Array)
      dates = inputDate.map((d2) => self2.parseDate(d2, format22));
    else if (inputDate instanceof Date || typeof inputDate === "number")
      dates = [self2.parseDate(inputDate, format22)];
    else if (typeof inputDate === "string") {
      switch (self2.config.mode) {
        case "single":
        case "time":
          dates = [self2.parseDate(inputDate, format22)];
          break;
        case "multiple":
          dates = inputDate.split(self2.config.conjunction).map((date) => self2.parseDate(date, format22));
          break;
        case "range":
          dates = inputDate.split(self2.l10n.rangeSeparator).map((date) => self2.parseDate(date, format22));
          break;
      }
    } else
      self2.config.errorHandler(new Error(`Invalid date supplied: ${JSON.stringify(inputDate)}`));
    self2.selectedDates = self2.config.allowInvalidPreload ? dates : dates.filter((d2) => d2 instanceof Date && isEnabled(d2, false));
    if (self2.config.mode === "range")
      self2.selectedDates.sort((a, b) => a.getTime() - b.getTime());
  }
  function setDate(date, triggerChange2 = false, format22 = self2.config.dateFormat) {
    if (date !== 0 && !date || date instanceof Array && date.length === 0)
      return self2.clear(triggerChange2);
    setSelectedDate(date, format22);
    self2.latestSelectedDateObj = self2.selectedDates[self2.selectedDates.length - 1];
    self2.redraw();
    jumpToDate(void 0, triggerChange2);
    setHoursFromDate();
    if (self2.selectedDates.length === 0) {
      self2.clear(false);
    }
    updateValue(triggerChange2);
    if (triggerChange2)
      triggerEvent("onChange");
  }
  function parseDateRules(arr) {
    return arr.slice().map((rule) => {
      if (typeof rule === "string" || typeof rule === "number" || rule instanceof Date) {
        return self2.parseDate(rule, void 0, true);
      } else if (rule && typeof rule === "object" && rule.from && rule.to)
        return {
          from: self2.parseDate(rule.from, void 0),
          to: self2.parseDate(rule.to, void 0)
        };
      return rule;
    }).filter((x) => x);
  }
  function setupDates() {
    self2.selectedDates = [];
    self2.now = self2.parseDate(self2.config.now) || new Date();
    const preloadedDate = self2.config.defaultDate || ((self2.input.nodeName === "INPUT" || self2.input.nodeName === "TEXTAREA") && self2.input.placeholder && self2.input.value === self2.input.placeholder ? null : self2.input.value);
    if (preloadedDate)
      setSelectedDate(preloadedDate, self2.config.dateFormat);
    self2._initialDate = self2.selectedDates.length > 0 ? self2.selectedDates[0] : self2.config.minDate && self2.config.minDate.getTime() > self2.now.getTime() ? self2.config.minDate : self2.config.maxDate && self2.config.maxDate.getTime() < self2.now.getTime() ? self2.config.maxDate : self2.now;
    self2.currentYear = self2._initialDate.getFullYear();
    self2.currentMonth = self2._initialDate.getMonth();
    if (self2.selectedDates.length > 0)
      self2.latestSelectedDateObj = self2.selectedDates[0];
    if (self2.config.minTime !== void 0)
      self2.config.minTime = self2.parseDate(self2.config.minTime, "H:i");
    if (self2.config.maxTime !== void 0)
      self2.config.maxTime = self2.parseDate(self2.config.maxTime, "H:i");
    self2.minDateHasTime = !!self2.config.minDate && (self2.config.minDate.getHours() > 0 || self2.config.minDate.getMinutes() > 0 || self2.config.minDate.getSeconds() > 0);
    self2.maxDateHasTime = !!self2.config.maxDate && (self2.config.maxDate.getHours() > 0 || self2.config.maxDate.getMinutes() > 0 || self2.config.maxDate.getSeconds() > 0);
  }
  function setupInputs() {
    self2.input = getInputElem();
    if (!self2.input) {
      self2.config.errorHandler(new Error("Invalid input element specified"));
      return;
    }
    self2.input._type = self2.input.type;
    self2.input.type = "text";
    self2.input.classList.add("flatpickr-input");
    self2._input = self2.input;
    if (self2.config.altInput) {
      self2.altInput = createElement(self2.input.nodeName, self2.config.altInputClass);
      self2._input = self2.altInput;
      self2.altInput.placeholder = self2.input.placeholder;
      self2.altInput.disabled = self2.input.disabled;
      self2.altInput.required = self2.input.required;
      self2.altInput.tabIndex = self2.input.tabIndex;
      self2.altInput.type = "text";
      self2.input.setAttribute("type", "hidden");
      if (!self2.config.static && self2.input.parentNode)
        self2.input.parentNode.insertBefore(self2.altInput, self2.input.nextSibling);
    }
    if (!self2.config.allowInput)
      self2._input.setAttribute("readonly", "readonly");
    self2._positionElement = self2.config.positionElement || self2._input;
  }
  function setupMobile() {
    const inputType = self2.config.enableTime ? self2.config.noCalendar ? "time" : "datetime-local" : "date";
    self2.mobileInput = createElement("input", self2.input.className + " flatpickr-mobile");
    self2.mobileInput.tabIndex = 1;
    self2.mobileInput.type = inputType;
    self2.mobileInput.disabled = self2.input.disabled;
    self2.mobileInput.required = self2.input.required;
    self2.mobileInput.placeholder = self2.input.placeholder;
    self2.mobileFormatStr = inputType === "datetime-local" ? "Y-m-d\\TH:i:S" : inputType === "date" ? "Y-m-d" : "H:i:S";
    if (self2.selectedDates.length > 0) {
      self2.mobileInput.defaultValue = self2.mobileInput.value = self2.formatDate(self2.selectedDates[0], self2.mobileFormatStr);
    }
    if (self2.config.minDate)
      self2.mobileInput.min = self2.formatDate(self2.config.minDate, "Y-m-d");
    if (self2.config.maxDate)
      self2.mobileInput.max = self2.formatDate(self2.config.maxDate, "Y-m-d");
    if (self2.input.getAttribute("step"))
      self2.mobileInput.step = String(self2.input.getAttribute("step"));
    self2.input.type = "hidden";
    if (self2.altInput !== void 0)
      self2.altInput.type = "hidden";
    try {
      if (self2.input.parentNode)
        self2.input.parentNode.insertBefore(self2.mobileInput, self2.input.nextSibling);
    } catch (_a) {
    }
    bind(self2.mobileInput, "change", (e) => {
      self2.setDate(getEventTarget(e).value, false, self2.mobileFormatStr);
      triggerEvent("onChange");
      triggerEvent("onClose");
    });
  }
  function toggle(e) {
    if (self2.isOpen === true)
      return self2.close();
    self2.open(e);
  }
  function triggerEvent(event, data) {
    if (self2.config === void 0)
      return;
    const hooks = self2.config[event];
    if (hooks !== void 0 && hooks.length > 0) {
      for (let i = 0; hooks[i] && i < hooks.length; i++)
        hooks[i](self2.selectedDates, self2.input.value, self2, data);
    }
    if (event === "onChange") {
      self2.input.dispatchEvent(createEvent("change"));
      self2.input.dispatchEvent(createEvent("input"));
    }
  }
  function createEvent(name) {
    const e = document.createEvent("Event");
    e.initEvent(name, true, true);
    return e;
  }
  function isDateSelected(date) {
    for (let i = 0; i < self2.selectedDates.length; i++) {
      if (compareDates(self2.selectedDates[i], date) === 0)
        return "" + i;
    }
    return false;
  }
  function isDateInRange(date) {
    if (self2.config.mode !== "range" || self2.selectedDates.length < 2)
      return false;
    return compareDates(date, self2.selectedDates[0]) >= 0 && compareDates(date, self2.selectedDates[1]) <= 0;
  }
  function updateNavigationCurrentMonth() {
    if (self2.config.noCalendar || self2.isMobile || !self2.monthNav)
      return;
    self2.yearElements.forEach((yearElement, i) => {
      const d2 = new Date(self2.currentYear, self2.currentMonth, 1);
      d2.setMonth(self2.currentMonth + i);
      if (self2.config.showMonths > 1 || self2.config.monthSelectorType === "static") {
        self2.monthElements[i].textContent = monthToStr(d2.getMonth(), self2.config.shorthandCurrentMonth, self2.l10n) + " ";
      } else {
        self2.monthsDropdownContainer.value = d2.getMonth().toString();
      }
      yearElement.value = d2.getFullYear().toString();
    });
    self2._hidePrevMonthArrow = self2.config.minDate !== void 0 && (self2.currentYear === self2.config.minDate.getFullYear() ? self2.currentMonth <= self2.config.minDate.getMonth() : self2.currentYear < self2.config.minDate.getFullYear());
    self2._hideNextMonthArrow = self2.config.maxDate !== void 0 && (self2.currentYear === self2.config.maxDate.getFullYear() ? self2.currentMonth + 1 > self2.config.maxDate.getMonth() : self2.currentYear > self2.config.maxDate.getFullYear());
  }
  function getDateStr(format22) {
    return self2.selectedDates.map((dObj) => self2.formatDate(dObj, format22)).filter((d2, i, arr) => self2.config.mode !== "range" || self2.config.enableTime || arr.indexOf(d2) === i).join(self2.config.mode !== "range" ? self2.config.conjunction : self2.l10n.rangeSeparator);
  }
  function updateValue(triggerChange2 = true) {
    if (self2.mobileInput !== void 0 && self2.mobileFormatStr) {
      self2.mobileInput.value = self2.latestSelectedDateObj !== void 0 ? self2.formatDate(self2.latestSelectedDateObj, self2.mobileFormatStr) : "";
    }
    self2.input.value = getDateStr(self2.config.dateFormat);
    if (self2.altInput !== void 0) {
      self2.altInput.value = getDateStr(self2.config.altFormat);
    }
    if (triggerChange2 !== false)
      triggerEvent("onValueUpdate");
  }
  function onMonthNavClick(e) {
    const eventTarget = getEventTarget(e);
    const isPrevMonth = self2.prevMonthNav.contains(eventTarget);
    const isNextMonth = self2.nextMonthNav.contains(eventTarget);
    if (isPrevMonth || isNextMonth) {
      changeMonth(isPrevMonth ? -1 : 1);
    } else if (self2.yearElements.indexOf(eventTarget) >= 0) {
      eventTarget.select();
    } else if (eventTarget.classList.contains("arrowUp")) {
      self2.changeYear(self2.currentYear + 1);
    } else if (eventTarget.classList.contains("arrowDown")) {
      self2.changeYear(self2.currentYear - 1);
    }
  }
  function timeWrapper(e) {
    e.preventDefault();
    const isKeyDown = e.type === "keydown", eventTarget = getEventTarget(e), input = eventTarget;
    if (self2.amPM !== void 0 && eventTarget === self2.amPM) {
      self2.amPM.textContent = self2.l10n.amPM[int(self2.amPM.textContent === self2.l10n.amPM[0])];
    }
    const min = parseFloat(input.getAttribute("min")), max = parseFloat(input.getAttribute("max")), step = parseFloat(input.getAttribute("step")), curValue = parseInt(input.value, 10), delta = e.delta || (isKeyDown ? e.which === 38 ? 1 : -1 : 0);
    let newValue = curValue + step * delta;
    if (typeof input.value !== "undefined" && input.value.length === 2) {
      const isHourElem = input === self2.hourElement, isMinuteElem = input === self2.minuteElement;
      if (newValue < min) {
        newValue = max + newValue + int(!isHourElem) + (int(isHourElem) && int(!self2.amPM));
        if (isMinuteElem)
          incrementNumInput(void 0, -1, self2.hourElement);
      } else if (newValue > max) {
        newValue = input === self2.hourElement ? newValue - max - int(!self2.amPM) : min;
        if (isMinuteElem)
          incrementNumInput(void 0, 1, self2.hourElement);
      }
      if (self2.amPM && isHourElem && (step === 1 ? newValue + curValue === 23 : Math.abs(newValue - curValue) > step)) {
        self2.amPM.textContent = self2.l10n.amPM[int(self2.amPM.textContent === self2.l10n.amPM[0])];
      }
      input.value = pad(newValue);
    }
  }
  init2();
  return self2;
}
function _flatpickr(nodeList, config) {
  const nodes = Array.prototype.slice.call(nodeList).filter((x) => x instanceof HTMLElement);
  const instances = [];
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    try {
      if (node.getAttribute("data-fp-omit") !== null)
        continue;
      if (node._flatpickr !== void 0) {
        node._flatpickr.destroy();
        node._flatpickr = void 0;
      }
      node._flatpickr = FlatpickrInstance(node, config || {});
      instances.push(node._flatpickr);
    } catch (e) {
      console.error(e);
    }
  }
  return instances.length === 1 ? instances[0] : instances;
}
if (typeof HTMLElement !== "undefined" && typeof HTMLCollection !== "undefined" && typeof NodeList !== "undefined") {
  HTMLCollection.prototype.flatpickr = NodeList.prototype.flatpickr = function(config) {
    return _flatpickr(this, config);
  };
  HTMLElement.prototype.flatpickr = function(config) {
    return _flatpickr([this], config);
  };
}
var flatpickr$2 = function(selector, config) {
  if (typeof selector === "string") {
    return _flatpickr(window.document.querySelectorAll(selector), config);
  } else if (selector instanceof Node) {
    return _flatpickr([selector], config);
  } else {
    return _flatpickr(selector, config);
  }
};
flatpickr$2.defaultConfig = {};
flatpickr$2.l10ns = {
  en: Object.assign({}, english),
  default: Object.assign({}, english)
};
flatpickr$2.localize = (l10n) => {
  flatpickr$2.l10ns.default = Object.assign(Object.assign({}, flatpickr$2.l10ns.default), l10n);
};
flatpickr$2.setDefaults = (config) => {
  flatpickr$2.defaultConfig = Object.assign(Object.assign({}, flatpickr$2.defaultConfig), config);
};
flatpickr$2.parseDate = createDateParser({});
flatpickr$2.formatDate = createDateFormatter({});
flatpickr$2.compareDates = compareDates;
if (typeof jQuery !== "undefined" && typeof jQuery.fn !== "undefined") {
  jQuery.fn.flatpickr = function(config) {
    return _flatpickr(this, config);
  };
}
Date.prototype.fp_incr = function(days) {
  return new Date(this.getFullYear(), this.getMonth(), this.getDate() + (typeof days === "string" ? parseInt(days, 10) : days));
};
if (typeof window !== "undefined") {
  window.flatpickr = flatpickr$2;
}
function stripOn(hook) {
  return hook.charAt(2).toLowerCase() + hook.substring(3);
}
var Flatpickr = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$restProps = compute_rest_props($$props, ["value", "formattedValue", "element", "dateFormat", "options", "input", "flatpickr"]);
  const hooks = new Set([
    "onChange",
    "onOpen",
    "onClose",
    "onMonthChange",
    "onYearChange",
    "onReady",
    "onValueUpdate",
    "onDayCreate"
  ]);
  let { value = "", formattedValue = "", element = null, dateFormat = null } = $$props;
  let { options: options22 = {} } = $$props;
  let ready = false;
  let { input = void 0, flatpickr: fp = void 0 } = $$props;
  const dispatch = createEventDispatcher();
  function addHooks(opts = {}) {
    opts = Object.assign({}, opts);
    for (const hook of hooks) {
      const firer = (selectedDates, dateStr, instance) => {
        dispatch(stripOn(hook), [selectedDates, dateStr, instance]);
      };
      if (hook in opts) {
        if (!Array.isArray(opts[hook]))
          opts[hook] = [opts[hook]];
        opts[hook].push(firer);
      } else {
        opts[hook] = [firer];
      }
    }
    if (opts.onChange && !opts.onChange.includes(updateValue))
      opts.onChange.push(updateValue);
    return opts;
  }
  function updateValue(newValue, dateStr) {
    value = Array.isArray(newValue) && newValue.length === 1 ? newValue[0] : newValue;
    formattedValue = dateStr;
  }
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.formattedValue === void 0 && $$bindings.formattedValue && formattedValue !== void 0)
    $$bindings.formattedValue(formattedValue);
  if ($$props.element === void 0 && $$bindings.element && element !== void 0)
    $$bindings.element(element);
  if ($$props.dateFormat === void 0 && $$bindings.dateFormat && dateFormat !== void 0)
    $$bindings.dateFormat(dateFormat);
  if ($$props.options === void 0 && $$bindings.options && options22 !== void 0)
    $$bindings.options(options22);
  if ($$props.input === void 0 && $$bindings.input && input !== void 0)
    $$bindings.input(input);
  if ($$props.flatpickr === void 0 && $$bindings.flatpickr && fp !== void 0)
    $$bindings.flatpickr(fp);
  {
    if (fp && ready) {
      fp.setDate(value, false, dateFormat);
    }
  }
  {
    if (fp && ready) {
      for (const [key, val] of Object.entries(addHooks(options22))) {
        fp.set(key, val);
      }
    }
  }
  return `${slots.default ? slots.default({}) : `
	<input${spread([escape_object($$restProps)])}${add_attribute("this", input, 0)}>
`}`;
});
var css$d = {
  code: ".box.svelte-gxjjue.svelte-gxjjue{--header-bg:var(--c-border);--header-text:var(--c-white);margin:var(--gap) 0;border-radius:var(--gbr) var(--gbr) 0 0}.box.nomargin.svelte-gxjjue.svelte-gxjjue{margin:0}header.svelte-gxjjue.svelte-gxjjue{position:sticky;top:calc(var(--header-height) + var(--gap));padding:1em var(--gap);background:rgb(var(--header-bg));font-size:var(--font-small);border-radius:var(--gbr) var(--gbr) 0 0;box-shadow:0 1px 2px rgba(0, 0, 0, .25)}header.svelte-gxjjue.svelte-gxjjue:last-child{border-radius:var(--gbr)}header.svelte-gxjjue h3.svelte-gxjjue{line-height:1;text-transform:uppercase;color:rgb(var(--header-text));font-weight:bold;font-size:inherit}.box[data-collapsible=true].svelte-gxjjue header.svelte-gxjjue{cursor:pointer}.box[data-collapsible=true].svelte-gxjjue header.svelte-gxjjue::after{content:' ';display:block;position:absolute;right:var(--gap);top:50%;width:calc(var(--gap) / 2);height:calc(var(--gap) / 2);border:2px solid rgb(var(--header-text));border-width:0 2px 2px 0;transform:translateY(-75%) rotate(45deg)}.box[data-collapsible=true][data-open=true].svelte-gxjjue header.svelte-gxjjue::after{transform:translateY(-25%) rotate(225deg)}",
  map: `{"version":3,"file":"Box.svelte","sources":["Box.svelte"],"sourcesContent":["<script>\\n  export let title;\\n  export let collapsible = false;\\n  export let open = true;\\n  export let nomargin = false;\\n<\/script>\\n\\n<style>\\n  .box {\\n    --header-bg: var(--c-border);\\n    --header-text: var(--c-white);\\n\\n    margin: var(--gap) 0;\\n    border-radius: var(--gbr) var(--gbr) 0 0;\\n  }\\n  .box.nomargin {\\n    margin: 0;\\n  }\\n  header {\\n    position: sticky;\\n    top: calc(var(--header-height) + var(--gap));\\n    padding: 1em var(--gap);\\n\\n    background: rgb(var(--header-bg));\\n\\n    font-size: var(--font-small);\\n    border-radius: var(--gbr) var(--gbr) 0 0;\\n    box-shadow: 0 1px 2px rgba(0, 0, 0, .25);\\n  }\\n  header:last-child {\\n    border-radius: var(--gbr);\\n  }\\n  header h3 {\\n    line-height: 1;\\n    text-transform: uppercase;\\n    color: rgb(var(--header-text));\\n    font-weight: bold;\\n    font-size: inherit;\\n  }\\n\\n  .box[data-collapsible=true] header {\\n    cursor: pointer;\\n  }\\n  .box[data-collapsible=true] header::after {\\n    content: ' ';\\n    display: block;\\n    position: absolute;\\n    right: var(--gap);\\n    top: 50%;\\n    width: calc(var(--gap) / 2);\\n    height: calc(var(--gap) / 2);\\n    border: 2px solid rgb(var(--header-text));\\n    border-width: 0 2px 2px 0;\\n    transform: translateY(-75%) rotate(45deg);\\n  }\\n  .box[data-collapsible=true][data-open=true] header::after {\\n    transform: translateY(-25%) rotate(225deg);\\n  }\\n\\n</style>\\n\\n<div class=\\"box  {nomargin ? 'nomargin': ''}\\" data-collapsible={collapsible} data-open={open}>\\n  <header on:click={() => open = !open}>\\n    <h3>{title}</h3>\\n  </header>\\n  {#if !collapsible || collapsible && open}\\n  <main><slot /></main>\\n  {/if}\\n</div>\\n"],"names":[],"mappings":"AAQE,IAAI,4BAAC,CAAC,AACJ,WAAW,CAAE,eAAe,CAC5B,aAAa,CAAE,cAAc,CAE7B,MAAM,CAAE,IAAI,KAAK,CAAC,CAAC,CAAC,CACpB,aAAa,CAAE,IAAI,KAAK,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,AAC1C,CAAC,AACD,IAAI,SAAS,4BAAC,CAAC,AACb,MAAM,CAAE,CAAC,AACX,CAAC,AACD,MAAM,4BAAC,CAAC,AACN,QAAQ,CAAE,MAAM,CAChB,GAAG,CAAE,KAAK,IAAI,eAAe,CAAC,CAAC,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,CAC5C,OAAO,CAAE,GAAG,CAAC,IAAI,KAAK,CAAC,CAEvB,UAAU,CAAE,IAAI,IAAI,WAAW,CAAC,CAAC,CAEjC,SAAS,CAAE,IAAI,YAAY,CAAC,CAC5B,aAAa,CAAE,IAAI,KAAK,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CACxC,UAAU,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,AAC1C,CAAC,AACD,kCAAM,WAAW,AAAC,CAAC,AACjB,aAAa,CAAE,IAAI,KAAK,CAAC,AAC3B,CAAC,AACD,oBAAM,CAAC,EAAE,cAAC,CAAC,AACT,WAAW,CAAE,CAAC,CACd,cAAc,CAAE,SAAS,CACzB,KAAK,CAAE,IAAI,IAAI,aAAa,CAAC,CAAC,CAC9B,WAAW,CAAE,IAAI,CACjB,SAAS,CAAE,OAAO,AACpB,CAAC,AAED,IAAI,CAAC,gBAAgB,CAAC,IAAI,eAAC,CAAC,MAAM,cAAC,CAAC,AAClC,MAAM,CAAE,OAAO,AACjB,CAAC,AACD,IAAI,CAAC,gBAAgB,CAAC,IAAI,eAAC,CAAC,oBAAM,OAAO,AAAC,CAAC,AACzC,OAAO,CAAE,GAAG,CACZ,OAAO,CAAE,KAAK,CACd,QAAQ,CAAE,QAAQ,CAClB,KAAK,CAAE,IAAI,KAAK,CAAC,CACjB,GAAG,CAAE,GAAG,CACR,KAAK,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAC3B,MAAM,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAC5B,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,IAAI,aAAa,CAAC,CAAC,CACzC,YAAY,CAAE,CAAC,CAAC,GAAG,CAAC,GAAG,CAAC,CAAC,CACzB,SAAS,CAAE,WAAW,IAAI,CAAC,CAAC,OAAO,KAAK,CAAC,AAC3C,CAAC,AACD,IAAI,CAAC,gBAAgB,CAAC,IAAI,CAAC,CAAC,SAAS,CAAC,IAAI,eAAC,CAAC,oBAAM,OAAO,AAAC,CAAC,AACzD,SAAS,CAAE,WAAW,IAAI,CAAC,CAAC,OAAO,MAAM,CAAC,AAC5C,CAAC"}`
};
var Box = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { title } = $$props;
  let { collapsible = false } = $$props;
  let { open = true } = $$props;
  let { nomargin = false } = $$props;
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.collapsible === void 0 && $$bindings.collapsible && collapsible !== void 0)
    $$bindings.collapsible(collapsible);
  if ($$props.open === void 0 && $$bindings.open && open !== void 0)
    $$bindings.open(open);
  if ($$props.nomargin === void 0 && $$bindings.nomargin && nomargin !== void 0)
    $$bindings.nomargin(nomargin);
  $$result.css.add(css$d);
  return `<div class="${"box " + escape2(nomargin ? "nomargin" : "") + " svelte-gxjjue"}"${add_attribute("data-collapsible", collapsible, 0)}${add_attribute("data-open", open, 0)}><header class="${"svelte-gxjjue"}"><h3 class="${"svelte-gxjjue"}">${escape2(title)}</h3></header>
  ${!collapsible || collapsible && open ? `<main>${slots.default ? slots.default({}) : ``}</main>` : ``}</div>`;
});
function isOutOfViewport(elem) {
  const bounding = elem.getBoundingClientRect();
  const out = {};
  out.top = bounding.top < 0;
  out.left = bounding.left < 0;
  out.bottom = bounding.bottom > (window.innerHeight || document.documentElement.clientHeight);
  out.right = bounding.right > (window.innerWidth || document.documentElement.clientWidth);
  out.any = out.top || out.left || out.bottom || out.right;
  return out;
}
var css$c = {
  code: ".item.svelte-3e0qet{cursor:default;height:var(--height, 42px);line-height:var(--height, 42px);padding:var(--itemPadding, 0 20px);color:var(--itemColor, inherit);text-overflow:ellipsis;overflow:hidden;white-space:nowrap}.groupHeader.svelte-3e0qet{text-transform:var(--groupTitleTextTransform, uppercase)}.groupItem.svelte-3e0qet{padding-left:var(--groupItemPaddingLeft, 40px)}.item.svelte-3e0qet:active{background:var(--itemActiveBackground, #b9daff)}.item.active.svelte-3e0qet{background:var(--itemIsActiveBG, #007aff);color:var(--itemIsActiveColor, #fff)}.item.notSelectable.svelte-3e0qet{color:var(--itemIsNotSelectableColor, #999)}.item.first.svelte-3e0qet{border-radius:var(--itemFirstBorderRadius, 4px 4px 0 0)}.item.hover.svelte-3e0qet:not(.active){background:var(--itemHoverBG, #e7f2ff);color:var(--itemHoverColor, inherit)}",
  map: `{"version":3,"file":"Item.svelte","sources":["Item.svelte"],"sourcesContent":["<script>\\n    export let isActive = false;\\n    export let isFirst = false;\\n    export let isHover = false;\\n    export let isSelectable = false;\\n    export let getOptionLabel = undefined;\\n    export let item = undefined;\\n    export let filterText = '';\\n\\n    let itemClasses = '';\\n\\n    $: {\\n        const classes = [];\\n        if (isActive) {\\n            classes.push('active');\\n        }\\n        if (isFirst) {\\n            classes.push('first');\\n        }\\n        if (isHover) {\\n            classes.push('hover');\\n        }\\n        if (item.isGroupHeader) {\\n            classes.push('groupHeader');\\n        }\\n        if (item.isGroupItem) {\\n            classes.push('groupItem');\\n        }\\n        if (!isSelectable) {\\n            classes.push('notSelectable');\\n        }\\n        itemClasses = classes.join(' ');\\n    }\\n<\/script>\\n\\n<style>\\n    .item {\\n        cursor: default;\\n        height: var(--height, 42px);\\n        line-height: var(--height, 42px);\\n        padding: var(--itemPadding, 0 20px);\\n        color: var(--itemColor, inherit);\\n        text-overflow: ellipsis;\\n        overflow: hidden;\\n        white-space: nowrap;\\n    }\\n\\n    .groupHeader {\\n        text-transform: var(--groupTitleTextTransform, uppercase);\\n    }\\n\\n    .groupItem {\\n        padding-left: var(--groupItemPaddingLeft, 40px);\\n    }\\n\\n    .item:active {\\n        background: var(--itemActiveBackground, #b9daff);\\n    }\\n\\n    .item.active {\\n        background: var(--itemIsActiveBG, #007aff);\\n        color: var(--itemIsActiveColor, #fff);\\n    }\\n\\n   .item.notSelectable {\\n        color: var(--itemIsNotSelectableColor, #999);\\n    }\\n\\n    .item.first {\\n        border-radius: var(--itemFirstBorderRadius, 4px 4px 0 0);\\n    }\\n\\n    .item.hover:not(.active) {\\n        background: var(--itemHoverBG, #e7f2ff);\\n        color: var(--itemHoverColor, inherit);\\n    }\\n</style>\\n\\n<div class=\\"item {itemClasses}\\">\\n    {@html getOptionLabel(item, filterText)}\\n</div>\\n"],"names":[],"mappings":"AAoCI,KAAK,cAAC,CAAC,AACH,MAAM,CAAE,OAAO,CACf,MAAM,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAC3B,WAAW,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAChC,OAAO,CAAE,IAAI,aAAa,CAAC,OAAO,CAAC,CACnC,KAAK,CAAE,IAAI,WAAW,CAAC,QAAQ,CAAC,CAChC,aAAa,CAAE,QAAQ,CACvB,QAAQ,CAAE,MAAM,CAChB,WAAW,CAAE,MAAM,AACvB,CAAC,AAED,YAAY,cAAC,CAAC,AACV,cAAc,CAAE,IAAI,yBAAyB,CAAC,UAAU,CAAC,AAC7D,CAAC,AAED,UAAU,cAAC,CAAC,AACR,YAAY,CAAE,IAAI,sBAAsB,CAAC,KAAK,CAAC,AACnD,CAAC,AAED,mBAAK,OAAO,AAAC,CAAC,AACV,UAAU,CAAE,IAAI,sBAAsB,CAAC,QAAQ,CAAC,AACpD,CAAC,AAED,KAAK,OAAO,cAAC,CAAC,AACV,UAAU,CAAE,IAAI,gBAAgB,CAAC,QAAQ,CAAC,CAC1C,KAAK,CAAE,IAAI,mBAAmB,CAAC,KAAK,CAAC,AACzC,CAAC,AAEF,KAAK,cAAc,cAAC,CAAC,AAChB,KAAK,CAAE,IAAI,0BAA0B,CAAC,KAAK,CAAC,AAChD,CAAC,AAED,KAAK,MAAM,cAAC,CAAC,AACT,aAAa,CAAE,IAAI,uBAAuB,CAAC,YAAY,CAAC,AAC5D,CAAC,AAED,KAAK,oBAAM,KAAK,OAAO,CAAC,AAAC,CAAC,AACtB,UAAU,CAAE,IAAI,aAAa,CAAC,QAAQ,CAAC,CACvC,KAAK,CAAE,IAAI,gBAAgB,CAAC,QAAQ,CAAC,AACzC,CAAC"}`
};
var Item = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { isActive = false } = $$props;
  let { isFirst = false } = $$props;
  let { isHover = false } = $$props;
  let { isSelectable = false } = $$props;
  let { getOptionLabel = void 0 } = $$props;
  let { item = void 0 } = $$props;
  let { filterText = "" } = $$props;
  let itemClasses = "";
  if ($$props.isActive === void 0 && $$bindings.isActive && isActive !== void 0)
    $$bindings.isActive(isActive);
  if ($$props.isFirst === void 0 && $$bindings.isFirst && isFirst !== void 0)
    $$bindings.isFirst(isFirst);
  if ($$props.isHover === void 0 && $$bindings.isHover && isHover !== void 0)
    $$bindings.isHover(isHover);
  if ($$props.isSelectable === void 0 && $$bindings.isSelectable && isSelectable !== void 0)
    $$bindings.isSelectable(isSelectable);
  if ($$props.getOptionLabel === void 0 && $$bindings.getOptionLabel && getOptionLabel !== void 0)
    $$bindings.getOptionLabel(getOptionLabel);
  if ($$props.item === void 0 && $$bindings.item && item !== void 0)
    $$bindings.item(item);
  if ($$props.filterText === void 0 && $$bindings.filterText && filterText !== void 0)
    $$bindings.filterText(filterText);
  $$result.css.add(css$c);
  {
    {
      const classes = [];
      if (isActive) {
        classes.push("active");
      }
      if (isFirst) {
        classes.push("first");
      }
      if (isHover) {
        classes.push("hover");
      }
      if (item.isGroupHeader) {
        classes.push("groupHeader");
      }
      if (item.isGroupItem) {
        classes.push("groupItem");
      }
      if (!isSelectable) {
        classes.push("notSelectable");
      }
      itemClasses = classes.join(" ");
    }
  }
  return `<div class="${"item " + escape2(itemClasses) + " svelte-3e0qet"}"><!-- HTML_TAG_START -->${getOptionLabel(item, filterText)}<!-- HTML_TAG_END --></div>`;
});
var css$b = {
  code: ".listContainer.svelte-1uyqfml{box-shadow:var(--listShadow, 0 2px 3px 0 rgba(44, 62, 80, 0.24));border-radius:var(--listBorderRadius, 4px);max-height:var(--listMaxHeight, 250px);overflow-y:auto;background:var(--listBackground, #fff);border:var(--listBorder, none);position:var(--listPosition, absolute);z-index:var(--listZIndex, 2);width:100%;left:var(--listLeft, 0);right:var(--listRight, 0)}.virtualList.svelte-1uyqfml{height:var(--virtualListHeight, 200px)}.listGroupTitle.svelte-1uyqfml{color:var(--groupTitleColor, #8f8f8f);cursor:default;font-size:var(--groupTitleFontSize, 12px);font-weight:var(--groupTitleFontWeight, 600);height:var(--height, 42px);line-height:var(--height, 42px);padding:var(--groupTitlePadding, 0 20px);text-overflow:ellipsis;overflow-x:hidden;white-space:nowrap;text-transform:var(--groupTitleTextTransform, uppercase)}.empty.svelte-1uyqfml{text-align:var(--listEmptyTextAlign, center);padding:var(--listEmptyPadding, 20px 0);color:var(--listEmptyColor, #78848f)}",
  map: `{"version":3,"file":"List.svelte","sources":["List.svelte"],"sourcesContent":["<script>\\n    import { beforeUpdate, createEventDispatcher, onMount, tick } from 'svelte';\\n    import isOutOfViewport from './utils/isOutOfViewport';\\n    import ItemComponent from './Item.svelte';\\n\\n    const dispatch = createEventDispatcher();\\n\\n    export let container = undefined;\\n    export let VirtualList = null;\\n    export let Item = ItemComponent;\\n    export let isVirtualList = false;\\n    export let items = [];\\n    export let labelIdentifier = 'label';\\n    export let getOptionLabel = (option, filterText) => {\\n        if (option)\\n            return option.isCreator\\n                ? \`Create \\\\\\"\${filterText}\\\\\\"\`\\n                : option[labelIdentifier];\\n    };\\n    export let getGroupHeaderLabel = null;\\n    export let itemHeight = 40;\\n    export let hoverItemIndex = 0;\\n    export let value = undefined;\\n    export let optionIdentifier = 'value';\\n    export let hideEmptyState = false;\\n    export let noOptionsMessage = 'No options';\\n    export let isMulti = false;\\n    export let activeItemIndex = 0;\\n    export let filterText = '';\\n    export let parent = null;\\n    export let listPlacement = null;\\n    export let listAutoWidth = null;\\n    export let listOffset = 5;\\n\\n    let isScrollingTimer = 0;\\n    let isScrolling = false;\\n    let prev_items;\\n\\n    onMount(() => {\\n        if (items.length > 0 && !isMulti && value) {\\n            const _hoverItemIndex = items.findIndex(\\n                (item) => item[optionIdentifier] === value[optionIdentifier]\\n            );\\n\\n            if (_hoverItemIndex) {\\n                hoverItemIndex = _hoverItemIndex;\\n            }\\n        }\\n\\n        scrollToActiveItem('active');\\n\\n        container.addEventListener(\\n            'scroll',\\n            () => {\\n                clearTimeout(isScrollingTimer);\\n\\n                isScrollingTimer = setTimeout(() => {\\n                    isScrolling = false;\\n                }, 100);\\n            },\\n            false\\n        );\\n    });\\n\\n    beforeUpdate(() => {\\n        if (!items) items = [];\\n        if (items !== prev_items && items.length > 0) {\\n            hoverItemIndex = 0;\\n        }\\n\\n        prev_items = items;\\n    });\\n\\n    function handleSelect(item) {\\n        if (item.isCreator) return;\\n        dispatch('itemSelected', item);\\n    }\\n\\n    function handleHover(i) {\\n        if (isScrolling) return;\\n        hoverItemIndex = i;\\n    }\\n\\n    function handleClick(args) {\\n        const { item, i, event } = args;\\n        event.stopPropagation();\\n\\n        if (\\n            value &&\\n            !isMulti &&\\n            value[optionIdentifier] === item[optionIdentifier]\\n        )\\n            return closeList();\\n\\n        if (item.isCreator) {\\n            dispatch('itemCreated', filterText);\\n        } else if (isItemSelectable(item)) {\\n            activeItemIndex = i;\\n            hoverItemIndex = i;\\n            handleSelect(item);\\n        }\\n    }\\n\\n    function closeList() {\\n        dispatch('closeList');\\n    }\\n\\n    async function updateHoverItem(increment) {\\n        if (isVirtualList) return;\\n\\n        let isNonSelectableItem = true;\\n\\n        while (isNonSelectableItem) {\\n            if (increment > 0 && hoverItemIndex === items.length - 1) {\\n                hoverItemIndex = 0;\\n            } else if (increment < 0 && hoverItemIndex === 0) {\\n                hoverItemIndex = items.length - 1;\\n            } else {\\n                hoverItemIndex = hoverItemIndex + increment;\\n            }\\n\\n            isNonSelectableItem = !isItemSelectable(items[hoverItemIndex]);\\n        }\\n\\n        await tick();\\n\\n        scrollToActiveItem('hover');\\n    }\\n\\n    function handleKeyDown(e) {\\n        switch (e.key) {\\n            case 'Escape':\\n                e.preventDefault();\\n                closeList();\\n                break;\\n            case 'ArrowDown':\\n                e.preventDefault();\\n                items.length && updateHoverItem(1);\\n                break;\\n            case 'ArrowUp':\\n                e.preventDefault();\\n                items.length && updateHoverItem(-1);\\n                break;\\n            case 'Enter':\\n                e.preventDefault();\\n                if (items.length === 0) break;\\n                const hoverItem = items[hoverItemIndex];\\n                if (\\n                    value &&\\n                    !isMulti &&\\n                    value[optionIdentifier] === hoverItem[optionIdentifier]\\n                ) {\\n                    closeList();\\n                    break;\\n                }\\n                if (hoverItem.isCreator) {\\n                    dispatch('itemCreated', filterText);\\n                } else {\\n                    activeItemIndex = hoverItemIndex;\\n                    handleSelect(items[hoverItemIndex]);\\n                }\\n                break;\\n            case 'Tab':\\n                e.preventDefault();\\n                if (items.length === 0) {\\n                    return closeList();\\n                }\\n                if (\\n                    value &&\\n                    value[optionIdentifier] ===\\n                        items[hoverItemIndex][optionIdentifier]\\n                )\\n                    return closeList();\\n                activeItemIndex = hoverItemIndex;\\n                handleSelect(items[hoverItemIndex]);\\n                break;\\n        }\\n    }\\n\\n    function scrollToActiveItem(className) {\\n        if (isVirtualList || !container) return;\\n\\n        let offsetBounding;\\n        const focusedElemBounding = container.querySelector(\\n            \`.listItem .\${className}\`\\n        );\\n\\n        if (focusedElemBounding) {\\n            offsetBounding =\\n                container.getBoundingClientRect().bottom -\\n                focusedElemBounding.getBoundingClientRect().bottom;\\n        }\\n\\n        container.scrollTop -= offsetBounding;\\n    }\\n\\n    function isItemActive(item, value, optionIdentifier) {\\n        return value && value[optionIdentifier] === item[optionIdentifier];\\n    }\\n\\n    function isItemFirst(itemIndex) {\\n        return itemIndex === 0;\\n    }\\n\\n    function isItemHover(hoverItemIndex, item, itemIndex, items) {\\n        return isItemSelectable(item) && (hoverItemIndex === itemIndex || items.length === 1);\\n    }\\n\\n    function isItemSelectable(item) {\\n        return (item.isGroupHeader && item.isSelectable) ||\\n            item.selectable ||\\n            !item.hasOwnProperty('selectable') // Default; if \`selectable\` was not specified, the object is selectable\\n    }\\n\\n    let listStyle;\\n    function computePlacement() {\\n        const { top, height, width } = parent.getBoundingClientRect();\\n\\n        listStyle = '';\\n        listStyle += \`min-width:\${width}px;width:\${\\n            listAutoWidth ? 'auto' : '100%'\\n        };\`;\\n\\n        if (\\n            listPlacement === 'top' ||\\n            (listPlacement === 'auto' && isOutOfViewport(parent).bottom)\\n        ) {\\n            listStyle += \`bottom:\${height + listOffset}px;\`;\\n        } else {\\n            listStyle += \`top:\${height + listOffset}px;\`;\\n        }\\n    }\\n\\n    $: {\\n        if (parent && container) computePlacement();\\n    }\\n<\/script>\\n\\n<style>\\n    .listContainer {\\n        box-shadow: var(--listShadow, 0 2px 3px 0 rgba(44, 62, 80, 0.24));\\n        border-radius: var(--listBorderRadius, 4px);\\n        max-height: var(--listMaxHeight, 250px);\\n        overflow-y: auto;\\n        background: var(--listBackground, #fff);\\n        border: var(--listBorder, none);\\n        position: var(--listPosition, absolute);\\n        z-index: var(--listZIndex, 2);\\n        width: 100%;\\n        left: var(--listLeft, 0);\\n        right: var(--listRight, 0);\\n    }\\n\\n    .virtualList {\\n        height: var(--virtualListHeight, 200px);\\n    }\\n\\n    .listGroupTitle {\\n        color: var(--groupTitleColor, #8f8f8f);\\n        cursor: default;\\n        font-size: var(--groupTitleFontSize, 12px);\\n        font-weight: var(--groupTitleFontWeight, 600);\\n        height: var(--height, 42px);\\n        line-height: var(--height, 42px);\\n        padding: var(--groupTitlePadding, 0 20px);\\n        text-overflow: ellipsis;\\n        overflow-x: hidden;\\n        white-space: nowrap;\\n        text-transform: var(--groupTitleTextTransform, uppercase);\\n    }\\n\\n    .empty {\\n        text-align: var(--listEmptyTextAlign, center);\\n        padding: var(--listEmptyPadding, 20px 0);\\n        color: var(--listEmptyColor, #78848f);\\n    }\\n</style>\\n\\n<svelte:window on:keydown={handleKeyDown} on:resize={computePlacement} />\\n\\n<div\\n    class=\\"listContainer\\"\\n    class:virtualList={isVirtualList}\\n    bind:this={container}\\n    style={listStyle}>\\n    {#if isVirtualList}\\n        <svelte:component\\n            this={VirtualList}\\n            {items}\\n            {itemHeight}\\n            let:item\\n            let:i>\\n            <div\\n                on:mouseover={() => handleHover(i)}\\n                on:focus={() => handleHover(i)}\\n                on:click={(event) => handleClick({ item, i, event })}\\n                class=\\"listItem\\">\\n                <svelte:component\\n                    this={Item}\\n                    {item}\\n                    {filterText}\\n                    {getOptionLabel}\\n                    isFirst={isItemFirst(i)}\\n                    isActive={isItemActive(item, value, optionIdentifier)}\\n                    isHover={isItemHover(hoverItemIndex, item, i, items)}\\n                    isSelectable={isItemSelectable(item)} />\\n            </div>\\n        </svelte:component>\\n    {:else}\\n        {#each items as item, i}\\n            {#if item.isGroupHeader && !item.isSelectable}\\n                <div class=\\"listGroupTitle\\">{getGroupHeaderLabel(item)}</div>\\n            {:else}\\n                <div\\n                    on:mouseover={() => handleHover(i)}\\n                    on:focus={() => handleHover(i)}\\n                    on:click={(event) => handleClick({ item, i, event })}\\n                    class=\\"listItem\\"\\n                    tabindex=\\"-1\\">\\n                    <svelte:component\\n                        this={Item}\\n                        {item}\\n                        {filterText}\\n                        {getOptionLabel}\\n                        isFirst={isItemFirst(i)}\\n                        isActive={isItemActive(item, value, optionIdentifier)}\\n                        isHover={isItemHover(hoverItemIndex, item, i, items)}\\n                        isSelectable={isItemSelectable(item)} />\\n                </div>\\n            {/if}\\n        {:else}\\n            {#if !hideEmptyState}\\n                <div class=\\"empty\\">{noOptionsMessage}</div>\\n            {/if}\\n        {/each}\\n    {/if}\\n</div>\\n"],"names":[],"mappings":"AA+OI,cAAc,eAAC,CAAC,AACZ,UAAU,CAAE,IAAI,YAAY,CAAC,mCAAmC,CAAC,CACjE,aAAa,CAAE,IAAI,kBAAkB,CAAC,IAAI,CAAC,CAC3C,UAAU,CAAE,IAAI,eAAe,CAAC,MAAM,CAAC,CACvC,UAAU,CAAE,IAAI,CAChB,UAAU,CAAE,IAAI,gBAAgB,CAAC,KAAK,CAAC,CACvC,MAAM,CAAE,IAAI,YAAY,CAAC,KAAK,CAAC,CAC/B,QAAQ,CAAE,IAAI,cAAc,CAAC,SAAS,CAAC,CACvC,OAAO,CAAE,IAAI,YAAY,CAAC,EAAE,CAAC,CAC7B,KAAK,CAAE,IAAI,CACX,IAAI,CAAE,IAAI,UAAU,CAAC,EAAE,CAAC,CACxB,KAAK,CAAE,IAAI,WAAW,CAAC,EAAE,CAAC,AAC9B,CAAC,AAED,YAAY,eAAC,CAAC,AACV,MAAM,CAAE,IAAI,mBAAmB,CAAC,MAAM,CAAC,AAC3C,CAAC,AAED,eAAe,eAAC,CAAC,AACb,KAAK,CAAE,IAAI,iBAAiB,CAAC,QAAQ,CAAC,CACtC,MAAM,CAAE,OAAO,CACf,SAAS,CAAE,IAAI,oBAAoB,CAAC,KAAK,CAAC,CAC1C,WAAW,CAAE,IAAI,sBAAsB,CAAC,IAAI,CAAC,CAC7C,MAAM,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAC3B,WAAW,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAChC,OAAO,CAAE,IAAI,mBAAmB,CAAC,OAAO,CAAC,CACzC,aAAa,CAAE,QAAQ,CACvB,UAAU,CAAE,MAAM,CAClB,WAAW,CAAE,MAAM,CACnB,cAAc,CAAE,IAAI,yBAAyB,CAAC,UAAU,CAAC,AAC7D,CAAC,AAED,MAAM,eAAC,CAAC,AACJ,UAAU,CAAE,IAAI,oBAAoB,CAAC,OAAO,CAAC,CAC7C,OAAO,CAAE,IAAI,kBAAkB,CAAC,OAAO,CAAC,CACxC,KAAK,CAAE,IAAI,gBAAgB,CAAC,QAAQ,CAAC,AACzC,CAAC"}`
};
function isItemActive(item, value, optionIdentifier) {
  return value && value[optionIdentifier] === item[optionIdentifier];
}
function isItemFirst(itemIndex) {
  return itemIndex === 0;
}
function isItemHover(hoverItemIndex, item, itemIndex, items) {
  return isItemSelectable(item) && (hoverItemIndex === itemIndex || items.length === 1);
}
function isItemSelectable(item) {
  return item.isGroupHeader && item.isSelectable || item.selectable || !item.hasOwnProperty("selectable");
}
var List = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  createEventDispatcher();
  let { container = void 0 } = $$props;
  let { VirtualList: VirtualList2 = null } = $$props;
  let { Item: Item$1 = Item } = $$props;
  let { isVirtualList = false } = $$props;
  let { items = [] } = $$props;
  let { labelIdentifier = "label" } = $$props;
  let { getOptionLabel = (option, filterText2) => {
    if (option)
      return option.isCreator ? `Create "${filterText2}"` : option[labelIdentifier];
  } } = $$props;
  let { getGroupHeaderLabel = null } = $$props;
  let { itemHeight = 40 } = $$props;
  let { hoverItemIndex = 0 } = $$props;
  let { value = void 0 } = $$props;
  let { optionIdentifier = "value" } = $$props;
  let { hideEmptyState = false } = $$props;
  let { noOptionsMessage = "No options" } = $$props;
  let { isMulti = false } = $$props;
  let { activeItemIndex = 0 } = $$props;
  let { filterText = "" } = $$props;
  let { parent = null } = $$props;
  let { listPlacement = null } = $$props;
  let { listAutoWidth = null } = $$props;
  let { listOffset = 5 } = $$props;
  let listStyle;
  function computePlacement() {
    const { top, height, width } = parent.getBoundingClientRect();
    listStyle = "";
    listStyle += `min-width:${width}px;width:${listAutoWidth ? "auto" : "100%"};`;
    if (listPlacement === "top" || listPlacement === "auto" && isOutOfViewport(parent).bottom) {
      listStyle += `bottom:${height + listOffset}px;`;
    } else {
      listStyle += `top:${height + listOffset}px;`;
    }
  }
  if ($$props.container === void 0 && $$bindings.container && container !== void 0)
    $$bindings.container(container);
  if ($$props.VirtualList === void 0 && $$bindings.VirtualList && VirtualList2 !== void 0)
    $$bindings.VirtualList(VirtualList2);
  if ($$props.Item === void 0 && $$bindings.Item && Item$1 !== void 0)
    $$bindings.Item(Item$1);
  if ($$props.isVirtualList === void 0 && $$bindings.isVirtualList && isVirtualList !== void 0)
    $$bindings.isVirtualList(isVirtualList);
  if ($$props.items === void 0 && $$bindings.items && items !== void 0)
    $$bindings.items(items);
  if ($$props.labelIdentifier === void 0 && $$bindings.labelIdentifier && labelIdentifier !== void 0)
    $$bindings.labelIdentifier(labelIdentifier);
  if ($$props.getOptionLabel === void 0 && $$bindings.getOptionLabel && getOptionLabel !== void 0)
    $$bindings.getOptionLabel(getOptionLabel);
  if ($$props.getGroupHeaderLabel === void 0 && $$bindings.getGroupHeaderLabel && getGroupHeaderLabel !== void 0)
    $$bindings.getGroupHeaderLabel(getGroupHeaderLabel);
  if ($$props.itemHeight === void 0 && $$bindings.itemHeight && itemHeight !== void 0)
    $$bindings.itemHeight(itemHeight);
  if ($$props.hoverItemIndex === void 0 && $$bindings.hoverItemIndex && hoverItemIndex !== void 0)
    $$bindings.hoverItemIndex(hoverItemIndex);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.optionIdentifier === void 0 && $$bindings.optionIdentifier && optionIdentifier !== void 0)
    $$bindings.optionIdentifier(optionIdentifier);
  if ($$props.hideEmptyState === void 0 && $$bindings.hideEmptyState && hideEmptyState !== void 0)
    $$bindings.hideEmptyState(hideEmptyState);
  if ($$props.noOptionsMessage === void 0 && $$bindings.noOptionsMessage && noOptionsMessage !== void 0)
    $$bindings.noOptionsMessage(noOptionsMessage);
  if ($$props.isMulti === void 0 && $$bindings.isMulti && isMulti !== void 0)
    $$bindings.isMulti(isMulti);
  if ($$props.activeItemIndex === void 0 && $$bindings.activeItemIndex && activeItemIndex !== void 0)
    $$bindings.activeItemIndex(activeItemIndex);
  if ($$props.filterText === void 0 && $$bindings.filterText && filterText !== void 0)
    $$bindings.filterText(filterText);
  if ($$props.parent === void 0 && $$bindings.parent && parent !== void 0)
    $$bindings.parent(parent);
  if ($$props.listPlacement === void 0 && $$bindings.listPlacement && listPlacement !== void 0)
    $$bindings.listPlacement(listPlacement);
  if ($$props.listAutoWidth === void 0 && $$bindings.listAutoWidth && listAutoWidth !== void 0)
    $$bindings.listAutoWidth(listAutoWidth);
  if ($$props.listOffset === void 0 && $$bindings.listOffset && listOffset !== void 0)
    $$bindings.listOffset(listOffset);
  $$result.css.add(css$b);
  {
    {
      if (parent && container)
        computePlacement();
    }
  }
  return `

<div class="${["listContainer svelte-1uyqfml", isVirtualList ? "virtualList" : ""].join(" ").trim()}"${add_attribute("style", listStyle, 0)}${add_attribute("this", container, 0)}>${isVirtualList ? `${validate_component(VirtualList2 || missing_component, "svelte:component").$$render($$result, { items, itemHeight }, {}, {
    default: ({ item, i }) => `<div class="${"listItem"}">${validate_component(Item$1 || missing_component, "svelte:component").$$render($$result, {
      item,
      filterText,
      getOptionLabel,
      isFirst: isItemFirst(i),
      isActive: isItemActive(item, value, optionIdentifier),
      isHover: isItemHover(hoverItemIndex, item, i, items),
      isSelectable: isItemSelectable(item)
    }, {}, {})}</div>`
  })}` : `${items.length ? each(items, (item, i) => `${item.isGroupHeader && !item.isSelectable ? `<div class="${"listGroupTitle svelte-1uyqfml"}">${escape2(getGroupHeaderLabel(item))}</div>` : `<div class="${"listItem"}" tabindex="${"-1"}">${validate_component(Item$1 || missing_component, "svelte:component").$$render($$result, {
    item,
    filterText,
    getOptionLabel,
    isFirst: isItemFirst(i),
    isActive: isItemActive(item, value, optionIdentifier),
    isHover: isItemHover(hoverItemIndex, item, i, items),
    isSelectable: isItemSelectable(item)
  }, {}, {})}
                </div>`}`) : `${!hideEmptyState ? `<div class="${"empty svelte-1uyqfml"}">${escape2(noOptionsMessage)}</div>` : ``}`}`}</div>`;
});
var css$a = {
  code: ".selection.svelte-pu1q1n{text-overflow:ellipsis;overflow-x:hidden;white-space:nowrap}",
  map: '{"version":3,"file":"Selection.svelte","sources":["Selection.svelte"],"sourcesContent":["<script>\\n    export let getSelectionLabel = undefined;\\n    export let item = undefined;\\n<\/script>\\n\\n<style>\\n    .selection {\\n        text-overflow: ellipsis;\\n        overflow-x: hidden;\\n        white-space: nowrap;\\n    }\\n</style>\\n\\n<div class=\\"selection\\">\\n    {@html getSelectionLabel(item)}\\n</div>\\n"],"names":[],"mappings":"AAMI,UAAU,cAAC,CAAC,AACR,aAAa,CAAE,QAAQ,CACvB,UAAU,CAAE,MAAM,CAClB,WAAW,CAAE,MAAM,AACvB,CAAC"}'
};
var Selection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { getSelectionLabel = void 0 } = $$props;
  let { item = void 0 } = $$props;
  if ($$props.getSelectionLabel === void 0 && $$bindings.getSelectionLabel && getSelectionLabel !== void 0)
    $$bindings.getSelectionLabel(getSelectionLabel);
  if ($$props.item === void 0 && $$bindings.item && item !== void 0)
    $$bindings.item(item);
  $$result.css.add(css$a);
  return `<div class="${"selection svelte-pu1q1n"}"><!-- HTML_TAG_START -->${getSelectionLabel(item)}<!-- HTML_TAG_END --></div>`;
});
var css$9 = {
  code: ".multiSelectItem.svelte-liu9pa.svelte-liu9pa{background:var(--multiItemBG, #ebedef);margin:var(--multiItemMargin, 5px 5px 0 0);border-radius:var(--multiItemBorderRadius, 16px);height:var(--multiItemHeight, 32px);line-height:var(--multiItemHeight, 32px);display:flex;cursor:default;padding:var(--multiItemPadding, 0 10px 0 15px);max-width:100%}.multiSelectItem_label.svelte-liu9pa.svelte-liu9pa{margin:var(--multiLabelMargin, 0 5px 0 0);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.multiSelectItem.svelte-liu9pa.svelte-liu9pa:hover,.multiSelectItem.active.svelte-liu9pa.svelte-liu9pa{background-color:var(--multiItemActiveBG, #006fff);color:var(--multiItemActiveColor, #fff)}.multiSelectItem.disabled.svelte-liu9pa.svelte-liu9pa:hover{background:var(--multiItemDisabledHoverBg, #ebedef);color:var(--multiItemDisabledHoverColor, #c1c6cc)}.multiSelectItem_clear.svelte-liu9pa.svelte-liu9pa{border-radius:var(--multiClearRadius, 50%);background:var(--multiClearBG, #52616f);min-width:var(--multiClearWidth, 16px);max-width:var(--multiClearWidth, 16px);height:var(--multiClearHeight, 16px);position:relative;top:var(--multiClearTop, 8px);text-align:var(--multiClearTextAlign, center);padding:var(--multiClearPadding, 1px)}.multiSelectItem_clear.svelte-liu9pa.svelte-liu9pa:hover,.active.svelte-liu9pa .multiSelectItem_clear.svelte-liu9pa{background:var(--multiClearHoverBG, #fff)}.multiSelectItem_clear.svelte-liu9pa:hover svg.svelte-liu9pa,.active.svelte-liu9pa .multiSelectItem_clear svg.svelte-liu9pa{fill:var(--multiClearHoverFill, #006fff)}.multiSelectItem_clear.svelte-liu9pa svg.svelte-liu9pa{fill:var(--multiClearFill, #ebedef);vertical-align:top}",
  map: `{"version":3,"file":"MultiSelection.svelte","sources":["MultiSelection.svelte"],"sourcesContent":["<script>\\n    import { createEventDispatcher } from 'svelte';\\n\\n    const dispatch = createEventDispatcher();\\n\\n    export let value = [];\\n    export let activeValue = undefined;\\n    export let isDisabled = false;\\n    export let multiFullItemClearable = false;\\n    export let getSelectionLabel = undefined;\\n\\n    function handleClear(i, event) {\\n        event.stopPropagation();\\n        dispatch('multiItemClear', { i });\\n    }\\n<\/script>\\n\\n<style>\\n    .multiSelectItem {\\n        background: var(--multiItemBG, #ebedef);\\n        margin: var(--multiItemMargin, 5px 5px 0 0);\\n        border-radius: var(--multiItemBorderRadius, 16px);\\n        height: var(--multiItemHeight, 32px);\\n        line-height: var(--multiItemHeight, 32px);\\n        display: flex;\\n        cursor: default;\\n        padding: var(--multiItemPadding, 0 10px 0 15px);\\n        max-width: 100%;\\n    }\\n\\n    .multiSelectItem_label {\\n        margin: var(--multiLabelMargin, 0 5px 0 0);\\n        overflow: hidden;\\n        text-overflow: ellipsis;\\n        white-space: nowrap;\\n    }\\n\\n    .multiSelectItem:hover,\\n    .multiSelectItem.active {\\n        background-color: var(--multiItemActiveBG, #006fff);\\n        color: var(--multiItemActiveColor, #fff);\\n    }\\n\\n    .multiSelectItem.disabled:hover {\\n        background: var(--multiItemDisabledHoverBg, #ebedef);\\n        color: var(--multiItemDisabledHoverColor, #c1c6cc);\\n    }\\n\\n    .multiSelectItem_clear {\\n        border-radius: var(--multiClearRadius, 50%);\\n        background: var(--multiClearBG, #52616f);\\n        min-width: var(--multiClearWidth, 16px);\\n        max-width: var(--multiClearWidth, 16px);\\n        height: var(--multiClearHeight, 16px);\\n        position: relative;\\n        top: var(--multiClearTop, 8px);\\n        text-align: var(--multiClearTextAlign, center);\\n        padding: var(--multiClearPadding, 1px);\\n    }\\n\\n    .multiSelectItem_clear:hover,\\n    .active .multiSelectItem_clear {\\n        background: var(--multiClearHoverBG, #fff);\\n    }\\n\\n    .multiSelectItem_clear:hover svg,\\n    .active .multiSelectItem_clear svg {\\n        fill: var(--multiClearHoverFill, #006fff);\\n    }\\n\\n    .multiSelectItem_clear svg {\\n        fill: var(--multiClearFill, #ebedef);\\n        vertical-align: top;\\n    }\\n</style>\\n\\n{#each value as item, i}\\n    <div\\n        class=\\"multiSelectItem {activeValue === i ? 'active' : ''} {isDisabled\\n            ? 'disabled'\\n            : ''}\\"\\n        on:click={(event) =>\\n            multiFullItemClearable ? handleClear(i, event) : {}}>\\n        <div class=\\"multiSelectItem_label\\">\\n            {@html getSelectionLabel(item)}\\n        </div>\\n        {#if !isDisabled && !multiFullItemClearable}\\n            <div\\n                class=\\"multiSelectItem_clear\\"\\n                on:click={(event) => handleClear(i, event)}>\\n                <svg\\n                    width=\\"100%\\"\\n                    height=\\"100%\\"\\n                    viewBox=\\"-2 -2 50 50\\"\\n                    focusable=\\"false\\"\\n                    aria-hidden=\\"true\\"\\n                    role=\\"presentation\\">\\n                    <path\\n                        d=\\"M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124 l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z\\" />\\n                </svg>\\n            </div>\\n        {/if}\\n    </div>\\n{/each}\\n"],"names":[],"mappings":"AAkBI,gBAAgB,4BAAC,CAAC,AACd,UAAU,CAAE,IAAI,aAAa,CAAC,QAAQ,CAAC,CACvC,MAAM,CAAE,IAAI,iBAAiB,CAAC,YAAY,CAAC,CAC3C,aAAa,CAAE,IAAI,uBAAuB,CAAC,KAAK,CAAC,CACjD,MAAM,CAAE,IAAI,iBAAiB,CAAC,KAAK,CAAC,CACpC,WAAW,CAAE,IAAI,iBAAiB,CAAC,KAAK,CAAC,CACzC,OAAO,CAAE,IAAI,CACb,MAAM,CAAE,OAAO,CACf,OAAO,CAAE,IAAI,kBAAkB,CAAC,cAAc,CAAC,CAC/C,SAAS,CAAE,IAAI,AACnB,CAAC,AAED,sBAAsB,4BAAC,CAAC,AACpB,MAAM,CAAE,IAAI,kBAAkB,CAAC,UAAU,CAAC,CAC1C,QAAQ,CAAE,MAAM,CAChB,aAAa,CAAE,QAAQ,CACvB,WAAW,CAAE,MAAM,AACvB,CAAC,AAED,4CAAgB,MAAM,CACtB,gBAAgB,OAAO,4BAAC,CAAC,AACrB,gBAAgB,CAAE,IAAI,mBAAmB,CAAC,QAAQ,CAAC,CACnD,KAAK,CAAE,IAAI,sBAAsB,CAAC,KAAK,CAAC,AAC5C,CAAC,AAED,gBAAgB,qCAAS,MAAM,AAAC,CAAC,AAC7B,UAAU,CAAE,IAAI,0BAA0B,CAAC,QAAQ,CAAC,CACpD,KAAK,CAAE,IAAI,6BAA6B,CAAC,QAAQ,CAAC,AACtD,CAAC,AAED,sBAAsB,4BAAC,CAAC,AACpB,aAAa,CAAE,IAAI,kBAAkB,CAAC,IAAI,CAAC,CAC3C,UAAU,CAAE,IAAI,cAAc,CAAC,QAAQ,CAAC,CACxC,SAAS,CAAE,IAAI,iBAAiB,CAAC,KAAK,CAAC,CACvC,SAAS,CAAE,IAAI,iBAAiB,CAAC,KAAK,CAAC,CACvC,MAAM,CAAE,IAAI,kBAAkB,CAAC,KAAK,CAAC,CACrC,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,IAAI,eAAe,CAAC,IAAI,CAAC,CAC9B,UAAU,CAAE,IAAI,qBAAqB,CAAC,OAAO,CAAC,CAC9C,OAAO,CAAE,IAAI,mBAAmB,CAAC,IAAI,CAAC,AAC1C,CAAC,AAED,kDAAsB,MAAM,CAC5B,qBAAO,CAAC,sBAAsB,cAAC,CAAC,AAC5B,UAAU,CAAE,IAAI,mBAAmB,CAAC,KAAK,CAAC,AAC9C,CAAC,AAED,oCAAsB,MAAM,CAAC,iBAAG,CAChC,qBAAO,CAAC,sBAAsB,CAAC,GAAG,cAAC,CAAC,AAChC,IAAI,CAAE,IAAI,qBAAqB,CAAC,QAAQ,CAAC,AAC7C,CAAC,AAED,oCAAsB,CAAC,GAAG,cAAC,CAAC,AACxB,IAAI,CAAE,IAAI,gBAAgB,CAAC,QAAQ,CAAC,CACpC,cAAc,CAAE,GAAG,AACvB,CAAC"}`
};
var MultiSelection = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  createEventDispatcher();
  let { value = [] } = $$props;
  let { activeValue = void 0 } = $$props;
  let { isDisabled = false } = $$props;
  let { multiFullItemClearable = false } = $$props;
  let { getSelectionLabel = void 0 } = $$props;
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.activeValue === void 0 && $$bindings.activeValue && activeValue !== void 0)
    $$bindings.activeValue(activeValue);
  if ($$props.isDisabled === void 0 && $$bindings.isDisabled && isDisabled !== void 0)
    $$bindings.isDisabled(isDisabled);
  if ($$props.multiFullItemClearable === void 0 && $$bindings.multiFullItemClearable && multiFullItemClearable !== void 0)
    $$bindings.multiFullItemClearable(multiFullItemClearable);
  if ($$props.getSelectionLabel === void 0 && $$bindings.getSelectionLabel && getSelectionLabel !== void 0)
    $$bindings.getSelectionLabel(getSelectionLabel);
  $$result.css.add(css$9);
  return `${each(value, (item, i) => `<div class="${"multiSelectItem " + escape2(activeValue === i ? "active" : "") + " " + escape2(isDisabled ? "disabled" : "") + " svelte-liu9pa"}"><div class="${"multiSelectItem_label svelte-liu9pa"}"><!-- HTML_TAG_START -->${getSelectionLabel(item)}<!-- HTML_TAG_END --></div>
        ${!isDisabled && !multiFullItemClearable ? `<div class="${"multiSelectItem_clear svelte-liu9pa"}"><svg width="${"100%"}" height="${"100%"}" viewBox="${"-2 -2 50 50"}" focusable="${"false"}" aria-hidden="${"true"}" role="${"presentation"}" class="${"svelte-liu9pa"}"><path d="${"M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124 l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z"}"></path></svg>
            </div>` : ``}
    </div>`)}`;
});
var css$8 = {
  code: "svelte-virtual-list-viewport.svelte-g2cagw{position:relative;overflow-y:auto;-webkit-overflow-scrolling:touch;display:block}svelte-virtual-list-contents.svelte-g2cagw,svelte-virtual-list-row.svelte-g2cagw{display:block}svelte-virtual-list-row.svelte-g2cagw{overflow:hidden}",
  map: `{"version":3,"file":"VirtualList.svelte","sources":["VirtualList.svelte"],"sourcesContent":["<script>\\n    import { onMount, tick } from 'svelte';\\n\\n    export let items = undefined;\\n    export let height = '100%';\\n    export let itemHeight = 40;\\n    export let hoverItemIndex = 0;\\n    export let start = 0;\\n    export let end = 0;\\n\\n    let height_map = [];\\n    let rows;\\n    let viewport;\\n    let contents;\\n    let viewport_height = 0;\\n    let visible;\\n    let mounted;\\n\\n    let top = 0;\\n    let bottom = 0;\\n    let average_height;\\n\\n    $: visible = items.slice(start, end).map((data, i) => {\\n        return { index: i + start, data };\\n    });\\n\\n    $: if (mounted) refresh(items, viewport_height, itemHeight);\\n\\n    async function refresh(items, viewport_height, itemHeight) {\\n        const { scrollTop } = viewport;\\n\\n        await tick();\\n\\n        let content_height = top - scrollTop;\\n        let i = start;\\n\\n        while (content_height < viewport_height && i < items.length) {\\n            let row = rows[i - start];\\n\\n            if (!row) {\\n                end = i + 1;\\n                await tick();\\n                row = rows[i - start];\\n            }\\n\\n            const row_height = (height_map[i] = itemHeight || row.offsetHeight);\\n            content_height += row_height;\\n            i += 1;\\n        }\\n\\n        end = i;\\n\\n        const remaining = items.length - end;\\n        average_height = (top + content_height) / end;\\n\\n        bottom = remaining * average_height;\\n        height_map.length = items.length;\\n\\n        if (viewport) viewport.scrollTop = 0;\\n    }\\n\\n    async function handle_scroll() {\\n        const { scrollTop } = viewport;\\n\\n        const old_start = start;\\n\\n        for (let v = 0; v < rows.length; v += 1) {\\n            height_map[start + v] = itemHeight || rows[v].offsetHeight;\\n        }\\n\\n        let i = 0;\\n        let y = 0;\\n\\n        while (i < items.length) {\\n            const row_height = height_map[i] || average_height;\\n            if (y + row_height > scrollTop) {\\n                start = i;\\n                top = y;\\n\\n                break;\\n            }\\n\\n            y += row_height;\\n            i += 1;\\n        }\\n\\n        while (i < items.length) {\\n            y += height_map[i] || average_height;\\n            i += 1;\\n\\n            if (y > scrollTop + viewport_height) break;\\n        }\\n\\n        end = i;\\n\\n        const remaining = items.length - end;\\n        average_height = y / end;\\n\\n        while (i < items.length) height_map[i++] = average_height;\\n        bottom = remaining * average_height;\\n\\n        if (start < old_start) {\\n            await tick();\\n\\n            let expected_height = 0;\\n            let actual_height = 0;\\n\\n            for (let i = start; i < old_start; i += 1) {\\n                if (rows[i - start]) {\\n                    expected_height += height_map[i];\\n                    actual_height += itemHeight || rows[i - start].offsetHeight;\\n                }\\n            }\\n\\n            const d = actual_height - expected_height;\\n            viewport.scrollTo(0, scrollTop + d);\\n        }\\n    }\\n\\n    onMount(() => {\\n        rows = contents.getElementsByTagName('svelte-virtual-list-row');\\n        mounted = true;\\n    });\\n<\/script>\\n\\n<style>\\n    svelte-virtual-list-viewport {\\n        position: relative;\\n        overflow-y: auto;\\n        -webkit-overflow-scrolling: touch;\\n        display: block;\\n    }\\n\\n    svelte-virtual-list-contents,\\n    svelte-virtual-list-row {\\n        display: block;\\n    }\\n\\n    svelte-virtual-list-row {\\n        overflow: hidden;\\n    }\\n</style>\\n\\n<svelte-virtual-list-viewport\\n    bind:this={viewport}\\n    bind:offsetHeight={viewport_height}\\n    on:scroll={handle_scroll}\\n    style=\\"height: {height};\\">\\n    <svelte-virtual-list-contents\\n        bind:this={contents}\\n        style=\\"padding-top: {top}px; padding-bottom: {bottom}px;\\">\\n        {#each visible as row (row.index)}\\n            <svelte-virtual-list-row>\\n                <slot item={row.data} i={row.index} {hoverItemIndex}>Missing template</slot>\\n            </svelte-virtual-list-row>\\n        {/each}\\n    </svelte-virtual-list-contents>\\n</svelte-virtual-list-viewport>\\n"],"names":[],"mappings":"AA8HI,4BAA4B,cAAC,CAAC,AAC1B,QAAQ,CAAE,QAAQ,CAClB,UAAU,CAAE,IAAI,CAChB,0BAA0B,CAAE,KAAK,CACjC,OAAO,CAAE,KAAK,AAClB,CAAC,AAED,0CAA4B,CAC5B,uBAAuB,cAAC,CAAC,AACrB,OAAO,CAAE,KAAK,AAClB,CAAC,AAED,uBAAuB,cAAC,CAAC,AACrB,QAAQ,CAAE,MAAM,AACpB,CAAC"}`
};
var VirtualList = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { items = void 0 } = $$props;
  let { height = "100%" } = $$props;
  let { itemHeight = 40 } = $$props;
  let { hoverItemIndex = 0 } = $$props;
  let { start = 0 } = $$props;
  let { end = 0 } = $$props;
  let viewport;
  let contents;
  let visible;
  let top = 0;
  let bottom = 0;
  if ($$props.items === void 0 && $$bindings.items && items !== void 0)
    $$bindings.items(items);
  if ($$props.height === void 0 && $$bindings.height && height !== void 0)
    $$bindings.height(height);
  if ($$props.itemHeight === void 0 && $$bindings.itemHeight && itemHeight !== void 0)
    $$bindings.itemHeight(itemHeight);
  if ($$props.hoverItemIndex === void 0 && $$bindings.hoverItemIndex && hoverItemIndex !== void 0)
    $$bindings.hoverItemIndex(hoverItemIndex);
  if ($$props.start === void 0 && $$bindings.start && start !== void 0)
    $$bindings.start(start);
  if ($$props.end === void 0 && $$bindings.end && end !== void 0)
    $$bindings.end(end);
  $$result.css.add(css$8);
  visible = items.slice(start, end).map((data, i) => {
    return { index: i + start, data };
  });
  return `<svelte-virtual-list-viewport style="${"height: " + escape2(height) + ";"}" class="${"svelte-g2cagw"}"${add_attribute("this", viewport, 0)}><svelte-virtual-list-contents style="${"padding-top: " + escape2(top) + "px; padding-bottom: " + escape2(bottom) + "px;"}" class="${"svelte-g2cagw"}"${add_attribute("this", contents, 0)}>${each(visible, (row) => `<svelte-virtual-list-row class="${"svelte-g2cagw"}">${slots.default ? slots.default({
    item: row.data,
    i: row.index,
    hoverItemIndex
  }) : `Missing template`}
            </svelte-virtual-list-row>`)}</svelte-virtual-list-contents></svelte-virtual-list-viewport>`;
});
var ClearIcon = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  return `<svg width="${"100%"}" height="${"100%"}" viewBox="${"-2 -2 50 50"}" focusable="${"false"}" aria-hidden="${"true"}" role="${"presentation"}"><path fill="${"currentColor"}" d="${"M34.923,37.251L24,26.328L13.077,37.251L9.436,33.61l10.923-10.923L9.436,11.765l3.641-3.641L24,19.047L34.923,8.124\n    l3.641,3.641L27.641,22.688L38.564,33.61L34.923,37.251z"}"></path></svg>`;
});
function debounce(func, wait, immediate) {
  let timeout;
  return function executedFunction() {
    let context = this;
    let args = arguments;
    let later = function() {
      timeout = null;
      if (!immediate)
        func.apply(context, args);
    };
    let callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow)
      func.apply(context, args);
  };
}
var { Object: Object_1 } = globals;
var css$7 = {
  code: ".selectContainer.svelte-17l1npl.svelte-17l1npl{--internalPadding:0 16px;border:var(--border, 1px solid #d8dbdf);border-radius:var(--borderRadius, 3px);box-sizing:border-box;height:var(--height, 42px);position:relative;display:flex;align-items:center;padding:var(--padding, var(--internalPadding));background:var(--background, #fff);margin:var(--margin, 0)}.selectContainer.svelte-17l1npl input.svelte-17l1npl{cursor:default;border:none;color:var(--inputColor, #3f4f5f);height:var(--height, 42px);line-height:var(--height, 42px);padding:var(--inputPadding, var(--padding, var(--internalPadding)));width:100%;background:transparent;font-size:var(--inputFontSize, 14px);letter-spacing:var(--inputLetterSpacing, -0.08px);position:absolute;left:var(--inputLeft, 0);margin:var(--inputMargin, 0)}.selectContainer.svelte-17l1npl input.svelte-17l1npl::placeholder{color:var(--placeholderColor, #78848f);opacity:var(--placeholderOpacity, 1)}.selectContainer.svelte-17l1npl input.svelte-17l1npl:focus{outline:none}.selectContainer.svelte-17l1npl.svelte-17l1npl:hover{border-color:var(--borderHoverColor, #b2b8bf)}.selectContainer.focused.svelte-17l1npl.svelte-17l1npl{border-color:var(--borderFocusColor, #006fe8)}.selectContainer.disabled.svelte-17l1npl.svelte-17l1npl{background:var(--disabledBackground, #ebedef);border-color:var(--disabledBorderColor, #ebedef);color:var(--disabledColor, #c1c6cc)}.selectContainer.disabled.svelte-17l1npl input.svelte-17l1npl::placeholder{color:var(--disabledPlaceholderColor, #c1c6cc);opacity:var(--disabledPlaceholderOpacity, 1)}.selectedItem.svelte-17l1npl.svelte-17l1npl{line-height:var(--height, 42px);height:var(--height, 42px);overflow-x:hidden;padding:var(--selectedItemPadding, 0 20px 0 0)}.selectedItem.svelte-17l1npl.svelte-17l1npl:focus{outline:none}.clearSelect.svelte-17l1npl.svelte-17l1npl{position:absolute;right:var(--clearSelectRight, 10px);top:var(--clearSelectTop, 11px);bottom:var(--clearSelectBottom, 11px);width:var(--clearSelectWidth, 20px);color:var(--clearSelectColor, #c5cacf);flex:none !important}.clearSelect.svelte-17l1npl.svelte-17l1npl:hover{color:var(--clearSelectHoverColor, #2c3e50)}.selectContainer.focused.svelte-17l1npl .clearSelect.svelte-17l1npl{color:var(--clearSelectFocusColor, #3f4f5f)}.indicator.svelte-17l1npl.svelte-17l1npl{position:absolute;right:var(--indicatorRight, 10px);top:var(--indicatorTop, 11px);width:var(--indicatorWidth, 20px);height:var(--indicatorHeight, 20px);color:var(--indicatorColor, #c5cacf)}.indicator.svelte-17l1npl svg.svelte-17l1npl{display:inline-block;fill:var(--indicatorFill, currentcolor);line-height:1;stroke:var(--indicatorStroke, currentcolor);stroke-width:0}.spinner.svelte-17l1npl.svelte-17l1npl{position:absolute;right:var(--spinnerRight, 10px);top:var(--spinnerLeft, 11px);width:var(--spinnerWidth, 20px);height:var(--spinnerHeight, 20px);color:var(--spinnerColor, #51ce6c);animation:svelte-17l1npl-rotate 0.75s linear infinite}.spinner_icon.svelte-17l1npl.svelte-17l1npl{display:block;height:100%;transform-origin:center center;width:100%;position:absolute;top:0;bottom:0;left:0;right:0;margin:auto;-webkit-transform:none}.spinner_path.svelte-17l1npl.svelte-17l1npl{stroke-dasharray:90;stroke-linecap:round}.multiSelect.svelte-17l1npl.svelte-17l1npl{display:flex;padding:var(--multiSelectPadding, 0 35px 0 16px);height:auto;flex-wrap:wrap;align-items:stretch}.multiSelect.svelte-17l1npl>.svelte-17l1npl{flex:1 1 50px}.selectContainer.multiSelect.svelte-17l1npl input.svelte-17l1npl{padding:var(--multiSelectInputPadding, 0);position:relative;margin:var(--multiSelectInputMargin, 0)}.hasError.svelte-17l1npl.svelte-17l1npl{border:var(--errorBorder, 1px solid #ff2d55);background:var(--errorBackground, #fff)}.a11yText.svelte-17l1npl.svelte-17l1npl{z-index:9999;border:0px;clip:rect(1px, 1px, 1px, 1px);height:1px;width:1px;position:absolute;overflow:hidden;padding:0px;white-space:nowrap}@keyframes svelte-17l1npl-rotate{100%{transform:rotate(360deg)}}",
  map: `{"version":3,"file":"Select.svelte","sources":["Select.svelte"],"sourcesContent":["<script>\\n    import { beforeUpdate, createEventDispatcher, onMount } from 'svelte';\\n\\n    import _List from './List.svelte';\\n    import _Item from './Item.svelte';\\n    import _Selection from './Selection.svelte';\\n    import _MultiSelection from './MultiSelection.svelte';\\n    import _VirtualList from './VirtualList.svelte';\\n    import _ClearIcon from './ClearIcon.svelte';\\n    import debounce from './utils/debounce';\\n\\n    const dispatch = createEventDispatcher();\\n\\n    export let id = null;\\n    export let container = undefined;\\n    export let input = undefined;\\n    export let isMulti = false;\\n    export let multiFullItemClearable = false;\\n    export let isDisabled = false;\\n    export let isCreatable = false;\\n    export let isFocused = false;\\n    export let value = null;\\n    export let filterText = '';\\n    export let placeholder = 'Select...';\\n    export let placeholderAlwaysShow = false;\\n    export let items = null;\\n    export let itemFilter = (label, filterText, option) =>\\n        \`\${label}\`.toLowerCase().includes(filterText.toLowerCase());\\n    export let groupBy = undefined;\\n    export let groupFilter = (groups) => groups;\\n    export let isGroupHeaderSelectable = false;\\n    export let getGroupHeaderLabel = (option) => {\\n        return option[labelIdentifier] || option.id;\\n    };\\n    export let labelIdentifier = 'label';\\n    export let getOptionLabel = (option, filterText) => {\\n        return option.isCreator\\n            ? \`Create \\\\\\"\${filterText}\\\\\\"\`\\n            : option[labelIdentifier];\\n    };\\n    export let optionIdentifier = 'value';\\n    export let loadOptions = undefined;\\n    export let hasError = false;\\n    export let containerStyles = '';\\n    export let getSelectionLabel = (option) => {\\n        if (option) return option[labelIdentifier];\\n        else return null;\\n    };\\n\\n    export let createGroupHeaderItem = (groupValue) => {\\n        return {\\n            value: groupValue,\\n            label: groupValue,\\n        };\\n    };\\n\\n    export let createItem = (filterText) => {\\n        return {\\n            value: filterText,\\n            label: filterText,\\n        };\\n    };\\n\\n    export const getFilteredItems = () => {\\n        return filteredItems;\\n    };\\n\\n    export let isSearchable = true;\\n    export let inputStyles = '';\\n    export let isClearable = true;\\n    export let isWaiting = false;\\n    export let listPlacement = 'auto';\\n    export let listOpen = false;\\n    export let isVirtualList = false;\\n    export let loadOptionsInterval = 300;\\n    export let noOptionsMessage = 'No options';\\n    export let hideEmptyState = false;\\n    export let inputAttributes = {};\\n    export let listAutoWidth = true;\\n    export let itemHeight = 40;\\n    export let Icon = undefined;\\n    export let iconProps = {};\\n    export let showChevron = false;\\n    export let showIndicator = false;\\n    export let containerClasses = '';\\n    export let indicatorSvg = undefined;\\n    export let listOffset = 5;\\n\\n    export let ClearIcon = _ClearIcon;\\n    export let Item = _Item;\\n    export let List = _List;\\n    export let Selection = _Selection;\\n    export let MultiSelection = _MultiSelection;\\n    export let VirtualList = _VirtualList;\\n\\n    function filterMethod(args) {\\n        if (args.loadOptions && args.filterText.length > 0) return;\\n        if (!args.items) return [];\\n\\n        if (\\n            args.items &&\\n            args.items.length > 0 &&\\n            typeof args.items[0] !== 'object'\\n        ) {\\n            args.items = convertStringItemsToObjects(args.items);\\n        }\\n\\n        let filterResults = args.items.filter((item) => {\\n            let matchesFilter = itemFilter(\\n                getOptionLabel(item, args.filterText),\\n                args.filterText,\\n                item\\n            );\\n\\n            if (\\n                matchesFilter &&\\n                args.isMulti &&\\n                args.value &&\\n                Array.isArray(args.value)\\n            ) {\\n                matchesFilter = !args.value.some((x) => {\\n                    return (\\n                        x[args.optionIdentifier] === item[args.optionIdentifier]\\n                    );\\n                });\\n            }\\n\\n            return matchesFilter;\\n        });\\n\\n        if (args.groupBy) {\\n            filterResults = filterGroupedItems(filterResults);\\n        }\\n\\n        if (args.isCreatable) {\\n            filterResults = addCreatableItem(filterResults, args.filterText);\\n        }\\n\\n        return filterResults;\\n    }\\n\\n    function addCreatableItem(_items, _filterText) {\\n        if (_filterText.length === 0) return _items;\\n        const itemToCreate = createItem(_filterText);\\n        if (_items[0] && _filterText === _items[0][labelIdentifier])\\n            return _items;\\n        itemToCreate.isCreator = true;\\n        return [..._items, itemToCreate];\\n    }\\n\\n    $: filteredItems = filterMethod({\\n        loadOptions,\\n        filterText,\\n        items,\\n        value,\\n        isMulti,\\n        optionIdentifier,\\n        groupBy,\\n        isCreatable,\\n    });\\n\\n    export let selectedValue = null;\\n    $: {\\n        if (selectedValue)\\n            console.warn(\\n                'selectedValue is no longer used. Please use value instead.'\\n            );\\n    }\\n\\n    let activeValue;\\n    let prev_value;\\n    let prev_filterText;\\n    let prev_isFocused;\\n    let prev_isMulti;\\n    let hoverItemIndex;\\n\\n    const getItems = debounce(async () => {\\n        isWaiting = true;\\n        let res = await loadOptions(filterText).catch((err) => {\\n            console.warn('svelte-select loadOptions error :>> ', err);\\n            dispatch('error', { type: 'loadOptions', details: err });\\n        });\\n\\n        if (res && !res.cancelled) {\\n            if (res) {\\n                if (res && res.length > 0 && typeof res[0] !== 'object') {\\n                    res = convertStringItemsToObjects(res);\\n                }\\n                filteredItems = [...res];\\n                dispatch('loaded', { items: filteredItems });\\n            } else {\\n                filteredItems = [];\\n            }\\n\\n            if (isCreatable) {\\n                filteredItems = addCreatableItem(filteredItems, filterText);\\n            }\\n\\n            isWaiting = false;\\n            isFocused = true;\\n            listOpen = true;\\n        }\\n    }, loadOptionsInterval);\\n\\n    $: updateValueDisplay(items);\\n\\n    function setValue() {\\n        if (typeof value === 'string') {\\n            value = {\\n                [optionIdentifier]: value,\\n                label: value,\\n            };\\n        } else if (isMulti && Array.isArray(value) && value.length > 0) {\\n            value = value.map((item) =>\\n                typeof item === 'string' ? { value: item, label: item } : item\\n            );\\n        }\\n    }\\n\\n    let _inputAttributes;\\n    function assignInputAttributes() {\\n        _inputAttributes = Object.assign(\\n            {\\n                autocapitalize: 'none',\\n                autocomplete: 'off',\\n                autocorrect: 'off',\\n                spellcheck: false,\\n                tabindex: 0,\\n                type: 'text',\\n                'aria-autocomplete': 'list',\\n            },\\n            inputAttributes\\n        );\\n\\n        if (id) {\\n            _inputAttributes.id = id;\\n        }\\n\\n        if (!isSearchable) {\\n            _inputAttributes.readonly = true;\\n        }\\n    }\\n\\n    function convertStringItemsToObjects(_items) {\\n        return _items.map((item, index) => {\\n            return {\\n                index,\\n                value: item,\\n                label: \`\${item}\`,\\n            };\\n        });\\n    }\\n\\n    function filterGroupedItems(_items) {\\n        const groupValues = [];\\n        const groups = {};\\n\\n        _items.forEach((item) => {\\n            const groupValue = groupBy(item);\\n\\n            if (!groupValues.includes(groupValue)) {\\n                groupValues.push(groupValue);\\n                groups[groupValue] = [];\\n\\n                if (groupValue) {\\n                    groups[groupValue].push(\\n                        Object.assign(createGroupHeaderItem(groupValue, item), {\\n                            id: groupValue,\\n                            isGroupHeader: true,\\n                            isSelectable: isGroupHeaderSelectable,\\n                        })\\n                    );\\n                }\\n            }\\n\\n            groups[groupValue].push(\\n                Object.assign({ isGroupItem: !!groupValue }, item)\\n            );\\n        });\\n\\n        const sortedGroupedItems = [];\\n\\n        groupFilter(groupValues).forEach((groupValue) => {\\n            sortedGroupedItems.push(...groups[groupValue]);\\n        });\\n\\n        return sortedGroupedItems;\\n    }\\n\\n    function dispatchSelectedItem() {\\n        if (isMulti) {\\n            if (JSON.stringify(value) !== JSON.stringify(prev_value)) {\\n                if (checkValueForDuplicates()) {\\n                    dispatch('select', value);\\n                }\\n            }\\n            return;\\n        }\\n\\n        if (\\n            !prev_value ||\\n            JSON.stringify(value[optionIdentifier]) !==\\n                JSON.stringify(prev_value[optionIdentifier])\\n        ) {\\n            dispatch('select', value);\\n        }\\n    }\\n\\n    function setupFocus() {\\n        if (isFocused || listOpen) {\\n            handleFocus();\\n        } else {\\n            if (input) input.blur();\\n        }\\n    }\\n\\n    function setupMulti() {\\n        if (value) {\\n            if (Array.isArray(value)) {\\n                value = [...value];\\n            } else {\\n                value = [value];\\n            }\\n        }\\n    }\\n\\n    function setupSingle() {\\n        if (value) value = null;\\n    }\\n\\n    $: {\\n        if (value) setValue();\\n    }\\n\\n    $: {\\n        if (inputAttributes || !isSearchable) assignInputAttributes();\\n    }\\n\\n    $: {\\n        if (isMulti) {\\n            setupMulti();\\n        }\\n\\n        if (prev_isMulti && !isMulti) {\\n            setupSingle();\\n        }\\n    }\\n\\n    $: {\\n        if (isMulti && value && value.length > 1) {\\n            checkValueForDuplicates();\\n        }\\n    }\\n\\n    $: {\\n        if (value) dispatchSelectedItem();\\n    }\\n\\n    $: {\\n        if (!value && isMulti && prev_value) {\\n            dispatch('select', value);\\n        }\\n    }\\n\\n    $: {\\n        if (isFocused !== prev_isFocused) {\\n            setupFocus();\\n        }\\n    }\\n\\n    $: {\\n        if (filterText !== prev_filterText) {\\n            setupFilterText();\\n        }\\n    }\\n\\n    function setupFilterText() {\\n        if (filterText.length === 0) return;\\n\\n        isFocused = true;\\n        listOpen = true;\\n\\n        if (loadOptions) {\\n            getItems();\\n        } else {\\n            listOpen = true;\\n\\n            if (isMulti) {\\n                activeValue = undefined;\\n            }\\n        }\\n    }\\n\\n    $: showSelectedItem = value && filterText.length === 0;\\n    $: showClearIcon =\\n        showSelectedItem && isClearable && !isDisabled && !isWaiting;\\n    $: placeholderText =\\n        placeholderAlwaysShow && isMulti\\n            ? placeholder\\n            : value\\n            ? ''\\n            : placeholder;\\n    $: showMultiSelect = isMulti && value && value.length > 0;\\n\\n    beforeUpdate(async () => {\\n        prev_value = value;\\n        prev_filterText = filterText;\\n        prev_isFocused = isFocused;\\n        prev_isMulti = isMulti;\\n    });\\n\\n    function checkValueForDuplicates() {\\n        let noDuplicates = true;\\n        if (value) {\\n            const ids = [];\\n            const uniqueValues = [];\\n\\n            value.forEach((val) => {\\n                if (!ids.includes(val[optionIdentifier])) {\\n                    ids.push(val[optionIdentifier]);\\n                    uniqueValues.push(val);\\n                } else {\\n                    noDuplicates = false;\\n                }\\n            });\\n\\n            if (!noDuplicates) value = uniqueValues;\\n        }\\n        return noDuplicates;\\n    }\\n\\n    function findItem(selection) {\\n        let matchTo = selection\\n            ? selection[optionIdentifier]\\n            : value[optionIdentifier];\\n        return items.find((item) => item[optionIdentifier] === matchTo);\\n    }\\n\\n    function updateValueDisplay(items) {\\n        if (\\n            !items ||\\n            items.length === 0 ||\\n            items.some((item) => typeof item !== 'object')\\n        )\\n            return;\\n        if (\\n            !value ||\\n            (isMulti\\n                ? value.some(\\n                      (selection) => !selection || !selection[optionIdentifier]\\n                  )\\n                : !value[optionIdentifier])\\n        )\\n            return;\\n\\n        if (Array.isArray(value)) {\\n            value = value.map((selection) => findItem(selection) || selection);\\n        } else {\\n            value = findItem() || value;\\n        }\\n    }\\n\\n    function handleMultiItemClear(event) {\\n        const { detail } = event;\\n        const itemToRemove = value[detail ? detail.i : value.length - 1];\\n\\n        if (value.length === 1) {\\n            value = undefined;\\n        } else {\\n            value = value.filter((item) => {\\n                return item !== itemToRemove;\\n            });\\n        }\\n\\n        dispatch('clear', itemToRemove);\\n    }\\n\\n    function handleKeyDown(e) {\\n        if (!isFocused) return;\\n\\n        switch (e.key) {\\n            case 'ArrowDown':\\n                e.preventDefault();\\n                listOpen = true;\\n                activeValue = undefined;\\n                break;\\n            case 'ArrowUp':\\n                e.preventDefault();\\n                listOpen = true;\\n                activeValue = undefined;\\n                break;\\n            case 'Tab':\\n                if (!listOpen) isFocused = false;\\n                break;\\n            case 'Backspace':\\n                if (!isMulti || filterText.length > 0) return;\\n                if (isMulti && value && value.length > 0) {\\n                    handleMultiItemClear(\\n                        activeValue !== undefined\\n                            ? activeValue\\n                            : value.length - 1\\n                    );\\n                    if (activeValue === 0 || activeValue === undefined) break;\\n                    activeValue =\\n                        value.length > activeValue\\n                            ? activeValue - 1\\n                            : undefined;\\n                }\\n                break;\\n            case 'ArrowLeft':\\n                if (!isMulti || filterText.length > 0) return;\\n                if (activeValue === undefined) {\\n                    activeValue = value.length - 1;\\n                } else if (value.length > activeValue && activeValue !== 0) {\\n                    activeValue -= 1;\\n                }\\n                break;\\n            case 'ArrowRight':\\n                if (\\n                    !isMulti ||\\n                    filterText.length > 0 ||\\n                    activeValue === undefined\\n                )\\n                    return;\\n                if (activeValue === value.length - 1) {\\n                    activeValue = undefined;\\n                } else if (activeValue < value.length - 1) {\\n                    activeValue += 1;\\n                }\\n                break;\\n        }\\n    }\\n\\n    function handleFocus() {\\n        isFocused = true;\\n        if (input) input.focus();\\n    }\\n\\n    function handleWindowEvent(event) {\\n        if (!container) return;\\n        const eventTarget =\\n            event.path && event.path.length > 0 ? event.path[0] : event.target;\\n        if (container.contains(eventTarget)) return;\\n        isFocused = false;\\n        listOpen = false;\\n        activeValue = undefined;\\n        if (input) input.blur();\\n    }\\n\\n    function handleClick() {\\n        if (isDisabled) return;\\n        isFocused = true;\\n        listOpen = !listOpen;\\n    }\\n\\n    export function handleClear() {\\n        value = undefined;\\n        listOpen = false;\\n        dispatch('clear', value);\\n        handleFocus();\\n    }\\n\\n    onMount(() => {\\n        if (isFocused && input) input.focus();\\n    });\\n\\n    $: listProps = {\\n        Item,\\n        filterText,\\n        optionIdentifier,\\n        noOptionsMessage,\\n        hideEmptyState,\\n        isVirtualList,\\n        VirtualList,\\n        value,\\n        isMulti,\\n        getGroupHeaderLabel,\\n        items: filteredItems,\\n        itemHeight,\\n        getOptionLabel,\\n        listPlacement,\\n        parent: container,\\n        listAutoWidth,\\n        listOffset,\\n    };\\n\\n    function itemSelected(event) {\\n        const { detail } = event;\\n\\n        if (detail) {\\n            filterText = '';\\n            const item = Object.assign({}, detail);\\n\\n            if (!item.isGroupHeader || item.isSelectable) {\\n                if (isMulti) {\\n                    value = value ? value.concat([item]) : [item];\\n                } else {\\n                    value = item;\\n                }\\n\\n                value = value;\\n\\n                setTimeout(() => {\\n                    listOpen = false;\\n                    activeValue = undefined;\\n                });\\n            }\\n        }\\n    }\\n\\n    function itemCreated(event) {\\n        const { detail } = event;\\n        if (isMulti) {\\n            value = value || [];\\n            value = [...value, createItem(detail)];\\n        } else {\\n            value = createItem(detail);\\n        }\\n\\n        dispatch('itemCreated', detail);\\n        filterText = '';\\n        listOpen = false;\\n        activeValue = undefined;\\n    }\\n\\n    function closeList() {\\n        filterText = '';\\n        listOpen = false;\\n    }\\n\\n    export let ariaValues = (values) => {\\n        return \`Option \${values}, selected.\`;\\n    };\\n\\n    export let ariaListOpen = (label, count) => {\\n        return \`You are currently focused on option \${label}. There are \${count} results available.\`;\\n    };\\n\\n    export let ariaFocused = () => {\\n        return \`Select is focused, type to refine list, press down to open the menu.\`;\\n    };\\n\\n    function handleAriaSelection() {\\n        let selected = undefined;\\n\\n        if (isMulti && value.length > 0) {\\n            selected = value.map((v) => getSelectionLabel(v)).join(', ');\\n        } else {\\n            selected = getSelectionLabel(value);\\n        }\\n\\n        return ariaValues(selected);\\n    }\\n\\n    function handleAriaContent() {\\n        if (!isFocused || !filteredItems || filteredItems.length === 0)\\n            return '';\\n\\n        let _item = filteredItems[hoverItemIndex];\\n        if (listOpen && _item) {\\n            let label = getSelectionLabel(_item);\\n            let count = filteredItems ? filteredItems.length : 0;\\n\\n            return ariaListOpen(label, count);\\n        } else {\\n            return ariaFocused();\\n        }\\n    }\\n\\n    $: ariaSelection = value ? handleAriaSelection(isMulti) : '';\\n    $: ariaContext = handleAriaContent(\\n        filteredItems,\\n        hoverItemIndex,\\n        isFocused,\\n        listOpen\\n    );\\n<\/script>\\n\\n<style>\\n    .selectContainer {\\n        --internalPadding: 0 16px;\\n        border: var(--border, 1px solid #d8dbdf);\\n        border-radius: var(--borderRadius, 3px);\\n        box-sizing: border-box;\\n        height: var(--height, 42px);\\n        position: relative;\\n        display: flex;\\n        align-items: center;\\n        padding: var(--padding, var(--internalPadding));\\n        background: var(--background, #fff);\\n        margin: var(--margin, 0);\\n    }\\n\\n    .selectContainer input {\\n        cursor: default;\\n        border: none;\\n        color: var(--inputColor, #3f4f5f);\\n        height: var(--height, 42px);\\n        line-height: var(--height, 42px);\\n        padding: var(--inputPadding, var(--padding, var(--internalPadding)));\\n        width: 100%;\\n        background: transparent;\\n        font-size: var(--inputFontSize, 14px);\\n        letter-spacing: var(--inputLetterSpacing, -0.08px);\\n        position: absolute;\\n        left: var(--inputLeft, 0);\\n        margin: var(--inputMargin, 0);\\n    }\\n\\n    .selectContainer input::placeholder {\\n        color: var(--placeholderColor, #78848f);\\n        opacity: var(--placeholderOpacity, 1);\\n    }\\n\\n    .selectContainer input:focus {\\n        outline: none;\\n    }\\n\\n    .selectContainer:hover {\\n        border-color: var(--borderHoverColor, #b2b8bf);\\n    }\\n\\n    .selectContainer.focused {\\n        border-color: var(--borderFocusColor, #006fe8);\\n    }\\n\\n    .selectContainer.disabled {\\n        background: var(--disabledBackground, #ebedef);\\n        border-color: var(--disabledBorderColor, #ebedef);\\n        color: var(--disabledColor, #c1c6cc);\\n    }\\n\\n    .selectContainer.disabled input::placeholder {\\n        color: var(--disabledPlaceholderColor, #c1c6cc);\\n        opacity: var(--disabledPlaceholderOpacity, 1);\\n    }\\n\\n    .selectedItem {\\n        line-height: var(--height, 42px);\\n        height: var(--height, 42px);\\n        overflow-x: hidden;\\n        padding: var(--selectedItemPadding, 0 20px 0 0);\\n    }\\n\\n    .selectedItem:focus {\\n        outline: none;\\n    }\\n\\n    .clearSelect {\\n        position: absolute;\\n        right: var(--clearSelectRight, 10px);\\n        top: var(--clearSelectTop, 11px);\\n        bottom: var(--clearSelectBottom, 11px);\\n        width: var(--clearSelectWidth, 20px);\\n        color: var(--clearSelectColor, #c5cacf);\\n        flex: none !important;\\n    }\\n\\n    .clearSelect:hover {\\n        color: var(--clearSelectHoverColor, #2c3e50);\\n    }\\n\\n    .selectContainer.focused .clearSelect {\\n        color: var(--clearSelectFocusColor, #3f4f5f);\\n    }\\n\\n    .indicator {\\n        position: absolute;\\n        right: var(--indicatorRight, 10px);\\n        top: var(--indicatorTop, 11px);\\n        width: var(--indicatorWidth, 20px);\\n        height: var(--indicatorHeight, 20px);\\n        color: var(--indicatorColor, #c5cacf);\\n    }\\n\\n    .indicator svg {\\n        display: inline-block;\\n        fill: var(--indicatorFill, currentcolor);\\n        line-height: 1;\\n        stroke: var(--indicatorStroke, currentcolor);\\n        stroke-width: 0;\\n    }\\n\\n    .spinner {\\n        position: absolute;\\n        right: var(--spinnerRight, 10px);\\n        top: var(--spinnerLeft, 11px);\\n        width: var(--spinnerWidth, 20px);\\n        height: var(--spinnerHeight, 20px);\\n        color: var(--spinnerColor, #51ce6c);\\n        animation: rotate 0.75s linear infinite;\\n    }\\n\\n    .spinner_icon {\\n        display: block;\\n        height: 100%;\\n        transform-origin: center center;\\n        width: 100%;\\n        position: absolute;\\n        top: 0;\\n        bottom: 0;\\n        left: 0;\\n        right: 0;\\n        margin: auto;\\n        -webkit-transform: none;\\n    }\\n\\n    .spinner_path {\\n        stroke-dasharray: 90;\\n        stroke-linecap: round;\\n    }\\n\\n    .multiSelect {\\n        display: flex;\\n        padding: var(--multiSelectPadding, 0 35px 0 16px);\\n        height: auto;\\n        flex-wrap: wrap;\\n        align-items: stretch;\\n    }\\n\\n    .multiSelect > * {\\n        flex: 1 1 50px;\\n    }\\n\\n    .selectContainer.multiSelect input {\\n        padding: var(--multiSelectInputPadding, 0);\\n        position: relative;\\n        margin: var(--multiSelectInputMargin, 0);\\n    }\\n\\n    .hasError {\\n        border: var(--errorBorder, 1px solid #ff2d55);\\n        background: var(--errorBackground, #fff);\\n    }\\n\\n    .a11yText {\\n        z-index: 9999;\\n        border: 0px;\\n        clip: rect(1px, 1px, 1px, 1px);\\n        height: 1px;\\n        width: 1px;\\n        position: absolute;\\n        overflow: hidden;\\n        padding: 0px;\\n        white-space: nowrap;\\n    }\\n\\n    @keyframes rotate {\\n        100% {\\n            transform: rotate(360deg);\\n        }\\n    }\\n</style>\\n\\n<svelte:window\\n    on:click={handleWindowEvent}\\n    on:focusin={handleWindowEvent}\\n    on:keydown={handleKeyDown} />\\n\\n<div\\n    class=\\"selectContainer {containerClasses}\\"\\n    class:hasError\\n    class:multiSelect={isMulti}\\n    class:disabled={isDisabled}\\n    class:focused={isFocused}\\n    style={containerStyles}\\n    on:click={handleClick}\\n    bind:this={container}>\\n    <span\\n        aria-live=\\"polite\\"\\n        aria-atomic=\\"false\\"\\n        aria-relevant=\\"additions text\\"\\n        class=\\"a11yText\\">\\n        {#if isFocused}\\n            <span id=\\"aria-selection\\">{ariaSelection}</span>\\n            <span id=\\"aria-context\\">\\n                {ariaContext}\\n            </span>\\n        {/if}\\n    </span>\\n\\n    {#if Icon}\\n        <svelte:component this={Icon} {...iconProps} />\\n    {/if}\\n\\n    {#if showMultiSelect}\\n        <svelte:component\\n            this={MultiSelection}\\n            {value}\\n            {getSelectionLabel}\\n            {activeValue}\\n            {isDisabled}\\n            {multiFullItemClearable}\\n            on:multiItemClear={handleMultiItemClear}\\n            on:focus={handleFocus} />\\n    {/if}\\n\\n    <input\\n        readOnly={!isSearchable}\\n        {..._inputAttributes}\\n        bind:this={input}\\n        on:focus={handleFocus}\\n        bind:value={filterText}\\n        placeholder={placeholderText}\\n        style={inputStyles}\\n        disabled={isDisabled} />\\n\\n    {#if !isMulti && showSelectedItem}\\n        <div class=\\"selectedItem\\" on:focus={handleFocus}>\\n            <svelte:component\\n                this={Selection}\\n                item={value}\\n                {getSelectionLabel} />\\n        </div>\\n    {/if}\\n\\n    {#if showClearIcon}\\n        <div\\n            class=\\"clearSelect\\"\\n            on:click|preventDefault={handleClear}\\n            aria-hidden=\\"true\\">\\n            <svelte:component this={ClearIcon} />\\n        </div>\\n    {/if}\\n\\n    {#if !showClearIcon && (showIndicator || (showChevron && !value) || (!isSearchable && !isDisabled && !isWaiting && ((showSelectedItem && !isClearable) || !showSelectedItem)))}\\n        <div class=\\"indicator\\" aria-hidden=\\"true\\">\\n            {#if indicatorSvg}\\n                {@html indicatorSvg}\\n            {:else}\\n                <svg\\n                    width=\\"100%\\"\\n                    height=\\"100%\\"\\n                    viewBox=\\"0 0 20 20\\"\\n                    focusable=\\"false\\"\\n                    aria-hidden=\\"true\\">\\n                    <path\\n                        d=\\"M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747\\n          3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0\\n          1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502\\n          0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0\\n          0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z\\" />\\n                </svg>\\n            {/if}\\n        </div>\\n    {/if}\\n\\n    {#if isWaiting}\\n        <div class=\\"spinner\\">\\n            <svg class=\\"spinner_icon\\" viewBox=\\"25 25 50 50\\">\\n                <circle\\n                    class=\\"spinner_path\\"\\n                    cx=\\"50\\"\\n                    cy=\\"50\\"\\n                    r=\\"20\\"\\n                    fill=\\"none\\"\\n                    stroke=\\"currentColor\\"\\n                    stroke-width=\\"5\\"\\n                    stroke-miterlimit=\\"10\\" />\\n            </svg>\\n        </div>\\n    {/if}\\n\\n    {#if listOpen}\\n        <svelte:component\\n            this={List}\\n            {...listProps}\\n            bind:hoverItemIndex\\n            on:itemSelected={itemSelected}\\n            on:itemCreated={itemCreated}\\n            on:closeList={closeList} />\\n    {/if}\\n\\n    {#if !isMulti || (isMulti && !showMultiSelect)}\\n        <input\\n            name={inputAttributes.name}\\n            type=\\"hidden\\"\\n            value={value ? getSelectionLabel(value) : null} />\\n    {/if}\\n\\n    {#if isMulti && showMultiSelect}\\n        {#each value as item}\\n            <input\\n                name={inputAttributes.name}\\n                type=\\"hidden\\"\\n                value={item ? getSelectionLabel(item) : null} />\\n        {/each}\\n    {/if}\\n</div>\\n"],"names":[],"mappings":"AAuqBI,gBAAgB,8BAAC,CAAC,AACd,iBAAiB,CAAE,MAAM,CACzB,MAAM,CAAE,IAAI,QAAQ,CAAC,kBAAkB,CAAC,CACxC,aAAa,CAAE,IAAI,cAAc,CAAC,IAAI,CAAC,CACvC,UAAU,CAAE,UAAU,CACtB,MAAM,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAC3B,QAAQ,CAAE,QAAQ,CAClB,OAAO,CAAE,IAAI,CACb,WAAW,CAAE,MAAM,CACnB,OAAO,CAAE,IAAI,SAAS,CAAC,uBAAuB,CAAC,CAC/C,UAAU,CAAE,IAAI,YAAY,CAAC,KAAK,CAAC,CACnC,MAAM,CAAE,IAAI,QAAQ,CAAC,EAAE,CAAC,AAC5B,CAAC,AAED,+BAAgB,CAAC,KAAK,eAAC,CAAC,AACpB,MAAM,CAAE,OAAO,CACf,MAAM,CAAE,IAAI,CACZ,KAAK,CAAE,IAAI,YAAY,CAAC,QAAQ,CAAC,CACjC,MAAM,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAC3B,WAAW,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAChC,OAAO,CAAE,IAAI,cAAc,CAAC,uCAAuC,CAAC,CACpE,KAAK,CAAE,IAAI,CACX,UAAU,CAAE,WAAW,CACvB,SAAS,CAAE,IAAI,eAAe,CAAC,KAAK,CAAC,CACrC,cAAc,CAAE,IAAI,oBAAoB,CAAC,QAAQ,CAAC,CAClD,QAAQ,CAAE,QAAQ,CAClB,IAAI,CAAE,IAAI,WAAW,CAAC,EAAE,CAAC,CACzB,MAAM,CAAE,IAAI,aAAa,CAAC,EAAE,CAAC,AACjC,CAAC,AAED,+BAAgB,CAAC,oBAAK,aAAa,AAAC,CAAC,AACjC,KAAK,CAAE,IAAI,kBAAkB,CAAC,QAAQ,CAAC,CACvC,OAAO,CAAE,IAAI,oBAAoB,CAAC,EAAE,CAAC,AACzC,CAAC,AAED,+BAAgB,CAAC,oBAAK,MAAM,AAAC,CAAC,AAC1B,OAAO,CAAE,IAAI,AACjB,CAAC,AAED,8CAAgB,MAAM,AAAC,CAAC,AACpB,YAAY,CAAE,IAAI,kBAAkB,CAAC,QAAQ,CAAC,AAClD,CAAC,AAED,gBAAgB,QAAQ,8BAAC,CAAC,AACtB,YAAY,CAAE,IAAI,kBAAkB,CAAC,QAAQ,CAAC,AAClD,CAAC,AAED,gBAAgB,SAAS,8BAAC,CAAC,AACvB,UAAU,CAAE,IAAI,oBAAoB,CAAC,QAAQ,CAAC,CAC9C,YAAY,CAAE,IAAI,qBAAqB,CAAC,QAAQ,CAAC,CACjD,KAAK,CAAE,IAAI,eAAe,CAAC,QAAQ,CAAC,AACxC,CAAC,AAED,gBAAgB,wBAAS,CAAC,oBAAK,aAAa,AAAC,CAAC,AAC1C,KAAK,CAAE,IAAI,0BAA0B,CAAC,QAAQ,CAAC,CAC/C,OAAO,CAAE,IAAI,4BAA4B,CAAC,EAAE,CAAC,AACjD,CAAC,AAED,aAAa,8BAAC,CAAC,AACX,WAAW,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAChC,MAAM,CAAE,IAAI,QAAQ,CAAC,KAAK,CAAC,CAC3B,UAAU,CAAE,MAAM,CAClB,OAAO,CAAE,IAAI,qBAAqB,CAAC,WAAW,CAAC,AACnD,CAAC,AAED,2CAAa,MAAM,AAAC,CAAC,AACjB,OAAO,CAAE,IAAI,AACjB,CAAC,AAED,YAAY,8BAAC,CAAC,AACV,QAAQ,CAAE,QAAQ,CAClB,KAAK,CAAE,IAAI,kBAAkB,CAAC,KAAK,CAAC,CACpC,GAAG,CAAE,IAAI,gBAAgB,CAAC,KAAK,CAAC,CAChC,MAAM,CAAE,IAAI,mBAAmB,CAAC,KAAK,CAAC,CACtC,KAAK,CAAE,IAAI,kBAAkB,CAAC,KAAK,CAAC,CACpC,KAAK,CAAE,IAAI,kBAAkB,CAAC,QAAQ,CAAC,CACvC,IAAI,CAAE,IAAI,CAAC,UAAU,AACzB,CAAC,AAED,0CAAY,MAAM,AAAC,CAAC,AAChB,KAAK,CAAE,IAAI,uBAAuB,CAAC,QAAQ,CAAC,AAChD,CAAC,AAED,gBAAgB,uBAAQ,CAAC,YAAY,eAAC,CAAC,AACnC,KAAK,CAAE,IAAI,uBAAuB,CAAC,QAAQ,CAAC,AAChD,CAAC,AAED,UAAU,8BAAC,CAAC,AACR,QAAQ,CAAE,QAAQ,CAClB,KAAK,CAAE,IAAI,gBAAgB,CAAC,KAAK,CAAC,CAClC,GAAG,CAAE,IAAI,cAAc,CAAC,KAAK,CAAC,CAC9B,KAAK,CAAE,IAAI,gBAAgB,CAAC,KAAK,CAAC,CAClC,MAAM,CAAE,IAAI,iBAAiB,CAAC,KAAK,CAAC,CACpC,KAAK,CAAE,IAAI,gBAAgB,CAAC,QAAQ,CAAC,AACzC,CAAC,AAED,yBAAU,CAAC,GAAG,eAAC,CAAC,AACZ,OAAO,CAAE,YAAY,CACrB,IAAI,CAAE,IAAI,eAAe,CAAC,aAAa,CAAC,CACxC,WAAW,CAAE,CAAC,CACd,MAAM,CAAE,IAAI,iBAAiB,CAAC,aAAa,CAAC,CAC5C,YAAY,CAAE,CAAC,AACnB,CAAC,AAED,QAAQ,8BAAC,CAAC,AACN,QAAQ,CAAE,QAAQ,CAClB,KAAK,CAAE,IAAI,cAAc,CAAC,KAAK,CAAC,CAChC,GAAG,CAAE,IAAI,aAAa,CAAC,KAAK,CAAC,CAC7B,KAAK,CAAE,IAAI,cAAc,CAAC,KAAK,CAAC,CAChC,MAAM,CAAE,IAAI,eAAe,CAAC,KAAK,CAAC,CAClC,KAAK,CAAE,IAAI,cAAc,CAAC,QAAQ,CAAC,CACnC,SAAS,CAAE,qBAAM,CAAC,KAAK,CAAC,MAAM,CAAC,QAAQ,AAC3C,CAAC,AAED,aAAa,8BAAC,CAAC,AACX,OAAO,CAAE,KAAK,CACd,MAAM,CAAE,IAAI,CACZ,gBAAgB,CAAE,MAAM,CAAC,MAAM,CAC/B,KAAK,CAAE,IAAI,CACX,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,CAAC,CACN,MAAM,CAAE,CAAC,CACT,IAAI,CAAE,CAAC,CACP,KAAK,CAAE,CAAC,CACR,MAAM,CAAE,IAAI,CACZ,iBAAiB,CAAE,IAAI,AAC3B,CAAC,AAED,aAAa,8BAAC,CAAC,AACX,gBAAgB,CAAE,EAAE,CACpB,cAAc,CAAE,KAAK,AACzB,CAAC,AAED,YAAY,8BAAC,CAAC,AACV,OAAO,CAAE,IAAI,CACb,OAAO,CAAE,IAAI,oBAAoB,CAAC,cAAc,CAAC,CACjD,MAAM,CAAE,IAAI,CACZ,SAAS,CAAE,IAAI,CACf,WAAW,CAAE,OAAO,AACxB,CAAC,AAED,2BAAY,CAAG,eAAE,CAAC,AACd,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,AAClB,CAAC,AAED,gBAAgB,2BAAY,CAAC,KAAK,eAAC,CAAC,AAChC,OAAO,CAAE,IAAI,yBAAyB,CAAC,EAAE,CAAC,CAC1C,QAAQ,CAAE,QAAQ,CAClB,MAAM,CAAE,IAAI,wBAAwB,CAAC,EAAE,CAAC,AAC5C,CAAC,AAED,SAAS,8BAAC,CAAC,AACP,MAAM,CAAE,IAAI,aAAa,CAAC,kBAAkB,CAAC,CAC7C,UAAU,CAAE,IAAI,iBAAiB,CAAC,KAAK,CAAC,AAC5C,CAAC,AAED,SAAS,8BAAC,CAAC,AACP,OAAO,CAAE,IAAI,CACb,MAAM,CAAE,GAAG,CACX,IAAI,CAAE,KAAK,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAAC,GAAG,CAAC,CAC9B,MAAM,CAAE,GAAG,CACX,KAAK,CAAE,GAAG,CACV,QAAQ,CAAE,QAAQ,CAClB,QAAQ,CAAE,MAAM,CAChB,OAAO,CAAE,GAAG,CACZ,WAAW,CAAE,MAAM,AACvB,CAAC,AAED,WAAW,qBAAO,CAAC,AACf,IAAI,AAAC,CAAC,AACF,SAAS,CAAE,OAAO,MAAM,CAAC,AAC7B,CAAC,AACL,CAAC"}`
};
function convertStringItemsToObjects(_items) {
  return _items.map((item, index2) => {
    return { index: index2, value: item, label: `${item}` };
  });
}
var Select = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let filteredItems;
  let showSelectedItem;
  let showClearIcon;
  let placeholderText;
  let showMultiSelect;
  let listProps;
  let ariaSelection;
  let ariaContext;
  const dispatch = createEventDispatcher();
  let { id = null } = $$props;
  let { container = void 0 } = $$props;
  let { input = void 0 } = $$props;
  let { isMulti = false } = $$props;
  let { multiFullItemClearable = false } = $$props;
  let { isDisabled = false } = $$props;
  let { isCreatable = false } = $$props;
  let { isFocused = false } = $$props;
  let { value = null } = $$props;
  let { filterText = "" } = $$props;
  let { placeholder = "Select..." } = $$props;
  let { placeholderAlwaysShow = false } = $$props;
  let { items = null } = $$props;
  let { itemFilter = (label, filterText2, option) => `${label}`.toLowerCase().includes(filterText2.toLowerCase()) } = $$props;
  let { groupBy = void 0 } = $$props;
  let { groupFilter = (groups) => groups } = $$props;
  let { isGroupHeaderSelectable = false } = $$props;
  let { getGroupHeaderLabel = (option) => {
    return option[labelIdentifier] || option.id;
  } } = $$props;
  let { labelIdentifier = "label" } = $$props;
  let { getOptionLabel = (option, filterText2) => {
    return option.isCreator ? `Create "${filterText2}"` : option[labelIdentifier];
  } } = $$props;
  let { optionIdentifier = "value" } = $$props;
  let { loadOptions = void 0 } = $$props;
  let { hasError = false } = $$props;
  let { containerStyles = "" } = $$props;
  let { getSelectionLabel = (option) => {
    if (option)
      return option[labelIdentifier];
    else
      return null;
  } } = $$props;
  let { createGroupHeaderItem = (groupValue) => {
    return { value: groupValue, label: groupValue };
  } } = $$props;
  let { createItem = (filterText2) => {
    return { value: filterText2, label: filterText2 };
  } } = $$props;
  const getFilteredItems = () => {
    return filteredItems;
  };
  let { isSearchable = true } = $$props;
  let { inputStyles = "" } = $$props;
  let { isClearable = true } = $$props;
  let { isWaiting = false } = $$props;
  let { listPlacement = "auto" } = $$props;
  let { listOpen = false } = $$props;
  let { isVirtualList = false } = $$props;
  let { loadOptionsInterval = 300 } = $$props;
  let { noOptionsMessage = "No options" } = $$props;
  let { hideEmptyState = false } = $$props;
  let { inputAttributes = {} } = $$props;
  let { listAutoWidth = true } = $$props;
  let { itemHeight = 40 } = $$props;
  let { Icon = void 0 } = $$props;
  let { iconProps = {} } = $$props;
  let { showChevron = false } = $$props;
  let { showIndicator = false } = $$props;
  let { containerClasses = "" } = $$props;
  let { indicatorSvg = void 0 } = $$props;
  let { listOffset = 5 } = $$props;
  let { ClearIcon: ClearIcon$1 = ClearIcon } = $$props;
  let { Item: Item$1 = Item } = $$props;
  let { List: List$1 = List } = $$props;
  let { Selection: Selection$1 = Selection } = $$props;
  let { MultiSelection: MultiSelection$1 = MultiSelection } = $$props;
  let { VirtualList: VirtualList$1 = VirtualList } = $$props;
  function filterMethod(args) {
    if (args.loadOptions && args.filterText.length > 0)
      return;
    if (!args.items)
      return [];
    if (args.items && args.items.length > 0 && typeof args.items[0] !== "object") {
      args.items = convertStringItemsToObjects(args.items);
    }
    let filterResults = args.items.filter((item) => {
      let matchesFilter = itemFilter(getOptionLabel(item, args.filterText), args.filterText, item);
      if (matchesFilter && args.isMulti && args.value && Array.isArray(args.value)) {
        matchesFilter = !args.value.some((x) => {
          return x[args.optionIdentifier] === item[args.optionIdentifier];
        });
      }
      return matchesFilter;
    });
    if (args.groupBy) {
      filterResults = filterGroupedItems(filterResults);
    }
    if (args.isCreatable) {
      filterResults = addCreatableItem(filterResults, args.filterText);
    }
    return filterResults;
  }
  function addCreatableItem(_items, _filterText) {
    if (_filterText.length === 0)
      return _items;
    const itemToCreate = createItem(_filterText);
    if (_items[0] && _filterText === _items[0][labelIdentifier])
      return _items;
    itemToCreate.isCreator = true;
    return [..._items, itemToCreate];
  }
  let { selectedValue = null } = $$props;
  let activeValue;
  let prev_value;
  let prev_filterText;
  let prev_isFocused;
  let hoverItemIndex;
  const getItems = debounce(async () => {
    isWaiting = true;
    let res = await loadOptions(filterText).catch((err) => {
      console.warn("svelte-select loadOptions error :>> ", err);
      dispatch("error", { type: "loadOptions", details: err });
    });
    if (res && !res.cancelled) {
      if (res) {
        if (res && res.length > 0 && typeof res[0] !== "object") {
          res = convertStringItemsToObjects(res);
        }
        filteredItems = [...res];
        dispatch("loaded", { items: filteredItems });
      } else {
        filteredItems = [];
      }
      if (isCreatable) {
        filteredItems = addCreatableItem(filteredItems, filterText);
      }
      isWaiting = false;
      isFocused = true;
      listOpen = true;
    }
  }, loadOptionsInterval);
  function setValue() {
    if (typeof value === "string") {
      value = { [optionIdentifier]: value, label: value };
    } else if (isMulti && Array.isArray(value) && value.length > 0) {
      value = value.map((item) => typeof item === "string" ? { value: item, label: item } : item);
    }
  }
  let _inputAttributes;
  function assignInputAttributes() {
    _inputAttributes = Object.assign({
      autocapitalize: "none",
      autocomplete: "off",
      autocorrect: "off",
      spellcheck: false,
      tabindex: 0,
      type: "text",
      "aria-autocomplete": "list"
    }, inputAttributes);
    if (id) {
      _inputAttributes.id = id;
    }
    if (!isSearchable) {
      _inputAttributes.readonly = true;
    }
  }
  function filterGroupedItems(_items) {
    const groupValues = [];
    const groups = {};
    _items.forEach((item) => {
      const groupValue = groupBy(item);
      if (!groupValues.includes(groupValue)) {
        groupValues.push(groupValue);
        groups[groupValue] = [];
        if (groupValue) {
          groups[groupValue].push(Object.assign(createGroupHeaderItem(groupValue, item), {
            id: groupValue,
            isGroupHeader: true,
            isSelectable: isGroupHeaderSelectable
          }));
        }
      }
      groups[groupValue].push(Object.assign({ isGroupItem: !!groupValue }, item));
    });
    const sortedGroupedItems = [];
    groupFilter(groupValues).forEach((groupValue) => {
      sortedGroupedItems.push(...groups[groupValue]);
    });
    return sortedGroupedItems;
  }
  function dispatchSelectedItem() {
    if (isMulti) {
      if (JSON.stringify(value) !== JSON.stringify(prev_value)) {
        if (checkValueForDuplicates()) {
          dispatch("select", value);
        }
      }
      return;
    }
    {
      dispatch("select", value);
    }
  }
  function setupFocus() {
    if (isFocused || listOpen) {
      handleFocus();
    } else {
      if (input)
        input.blur();
    }
  }
  function setupMulti() {
    if (value) {
      if (Array.isArray(value)) {
        value = [...value];
      } else {
        value = [value];
      }
    }
  }
  function setupFilterText() {
    if (filterText.length === 0)
      return;
    isFocused = true;
    listOpen = true;
    if (loadOptions) {
      getItems();
    } else {
      listOpen = true;
      if (isMulti) {
        activeValue = void 0;
      }
    }
  }
  function checkValueForDuplicates() {
    let noDuplicates = true;
    if (value) {
      const ids = [];
      const uniqueValues = [];
      value.forEach((val) => {
        if (!ids.includes(val[optionIdentifier])) {
          ids.push(val[optionIdentifier]);
          uniqueValues.push(val);
        } else {
          noDuplicates = false;
        }
      });
      if (!noDuplicates)
        value = uniqueValues;
    }
    return noDuplicates;
  }
  function findItem(selection) {
    let matchTo = selection ? selection[optionIdentifier] : value[optionIdentifier];
    return items.find((item) => item[optionIdentifier] === matchTo);
  }
  function updateValueDisplay(items2) {
    if (!items2 || items2.length === 0 || items2.some((item) => typeof item !== "object"))
      return;
    if (!value || (isMulti ? value.some((selection) => !selection || !selection[optionIdentifier]) : !value[optionIdentifier]))
      return;
    if (Array.isArray(value)) {
      value = value.map((selection) => findItem(selection) || selection);
    } else {
      value = findItem() || value;
    }
  }
  function handleFocus() {
    isFocused = true;
    if (input)
      input.focus();
  }
  function handleClear() {
    value = void 0;
    listOpen = false;
    dispatch("clear", value);
    handleFocus();
  }
  let { ariaValues = (values) => {
    return `Option ${values}, selected.`;
  } } = $$props;
  let { ariaListOpen = (label, count) => {
    return `You are currently focused on option ${label}. There are ${count} results available.`;
  } } = $$props;
  let { ariaFocused = () => {
    return `Select is focused, type to refine list, press down to open the menu.`;
  } } = $$props;
  function handleAriaSelection() {
    let selected = void 0;
    if (isMulti && value.length > 0) {
      selected = value.map((v) => getSelectionLabel(v)).join(", ");
    } else {
      selected = getSelectionLabel(value);
    }
    return ariaValues(selected);
  }
  function handleAriaContent() {
    if (!isFocused || !filteredItems || filteredItems.length === 0)
      return "";
    let _item = filteredItems[hoverItemIndex];
    if (listOpen && _item) {
      let label = getSelectionLabel(_item);
      let count = filteredItems ? filteredItems.length : 0;
      return ariaListOpen(label, count);
    } else {
      return ariaFocused();
    }
  }
  if ($$props.id === void 0 && $$bindings.id && id !== void 0)
    $$bindings.id(id);
  if ($$props.container === void 0 && $$bindings.container && container !== void 0)
    $$bindings.container(container);
  if ($$props.input === void 0 && $$bindings.input && input !== void 0)
    $$bindings.input(input);
  if ($$props.isMulti === void 0 && $$bindings.isMulti && isMulti !== void 0)
    $$bindings.isMulti(isMulti);
  if ($$props.multiFullItemClearable === void 0 && $$bindings.multiFullItemClearable && multiFullItemClearable !== void 0)
    $$bindings.multiFullItemClearable(multiFullItemClearable);
  if ($$props.isDisabled === void 0 && $$bindings.isDisabled && isDisabled !== void 0)
    $$bindings.isDisabled(isDisabled);
  if ($$props.isCreatable === void 0 && $$bindings.isCreatable && isCreatable !== void 0)
    $$bindings.isCreatable(isCreatable);
  if ($$props.isFocused === void 0 && $$bindings.isFocused && isFocused !== void 0)
    $$bindings.isFocused(isFocused);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.filterText === void 0 && $$bindings.filterText && filterText !== void 0)
    $$bindings.filterText(filterText);
  if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0)
    $$bindings.placeholder(placeholder);
  if ($$props.placeholderAlwaysShow === void 0 && $$bindings.placeholderAlwaysShow && placeholderAlwaysShow !== void 0)
    $$bindings.placeholderAlwaysShow(placeholderAlwaysShow);
  if ($$props.items === void 0 && $$bindings.items && items !== void 0)
    $$bindings.items(items);
  if ($$props.itemFilter === void 0 && $$bindings.itemFilter && itemFilter !== void 0)
    $$bindings.itemFilter(itemFilter);
  if ($$props.groupBy === void 0 && $$bindings.groupBy && groupBy !== void 0)
    $$bindings.groupBy(groupBy);
  if ($$props.groupFilter === void 0 && $$bindings.groupFilter && groupFilter !== void 0)
    $$bindings.groupFilter(groupFilter);
  if ($$props.isGroupHeaderSelectable === void 0 && $$bindings.isGroupHeaderSelectable && isGroupHeaderSelectable !== void 0)
    $$bindings.isGroupHeaderSelectable(isGroupHeaderSelectable);
  if ($$props.getGroupHeaderLabel === void 0 && $$bindings.getGroupHeaderLabel && getGroupHeaderLabel !== void 0)
    $$bindings.getGroupHeaderLabel(getGroupHeaderLabel);
  if ($$props.labelIdentifier === void 0 && $$bindings.labelIdentifier && labelIdentifier !== void 0)
    $$bindings.labelIdentifier(labelIdentifier);
  if ($$props.getOptionLabel === void 0 && $$bindings.getOptionLabel && getOptionLabel !== void 0)
    $$bindings.getOptionLabel(getOptionLabel);
  if ($$props.optionIdentifier === void 0 && $$bindings.optionIdentifier && optionIdentifier !== void 0)
    $$bindings.optionIdentifier(optionIdentifier);
  if ($$props.loadOptions === void 0 && $$bindings.loadOptions && loadOptions !== void 0)
    $$bindings.loadOptions(loadOptions);
  if ($$props.hasError === void 0 && $$bindings.hasError && hasError !== void 0)
    $$bindings.hasError(hasError);
  if ($$props.containerStyles === void 0 && $$bindings.containerStyles && containerStyles !== void 0)
    $$bindings.containerStyles(containerStyles);
  if ($$props.getSelectionLabel === void 0 && $$bindings.getSelectionLabel && getSelectionLabel !== void 0)
    $$bindings.getSelectionLabel(getSelectionLabel);
  if ($$props.createGroupHeaderItem === void 0 && $$bindings.createGroupHeaderItem && createGroupHeaderItem !== void 0)
    $$bindings.createGroupHeaderItem(createGroupHeaderItem);
  if ($$props.createItem === void 0 && $$bindings.createItem && createItem !== void 0)
    $$bindings.createItem(createItem);
  if ($$props.getFilteredItems === void 0 && $$bindings.getFilteredItems && getFilteredItems !== void 0)
    $$bindings.getFilteredItems(getFilteredItems);
  if ($$props.isSearchable === void 0 && $$bindings.isSearchable && isSearchable !== void 0)
    $$bindings.isSearchable(isSearchable);
  if ($$props.inputStyles === void 0 && $$bindings.inputStyles && inputStyles !== void 0)
    $$bindings.inputStyles(inputStyles);
  if ($$props.isClearable === void 0 && $$bindings.isClearable && isClearable !== void 0)
    $$bindings.isClearable(isClearable);
  if ($$props.isWaiting === void 0 && $$bindings.isWaiting && isWaiting !== void 0)
    $$bindings.isWaiting(isWaiting);
  if ($$props.listPlacement === void 0 && $$bindings.listPlacement && listPlacement !== void 0)
    $$bindings.listPlacement(listPlacement);
  if ($$props.listOpen === void 0 && $$bindings.listOpen && listOpen !== void 0)
    $$bindings.listOpen(listOpen);
  if ($$props.isVirtualList === void 0 && $$bindings.isVirtualList && isVirtualList !== void 0)
    $$bindings.isVirtualList(isVirtualList);
  if ($$props.loadOptionsInterval === void 0 && $$bindings.loadOptionsInterval && loadOptionsInterval !== void 0)
    $$bindings.loadOptionsInterval(loadOptionsInterval);
  if ($$props.noOptionsMessage === void 0 && $$bindings.noOptionsMessage && noOptionsMessage !== void 0)
    $$bindings.noOptionsMessage(noOptionsMessage);
  if ($$props.hideEmptyState === void 0 && $$bindings.hideEmptyState && hideEmptyState !== void 0)
    $$bindings.hideEmptyState(hideEmptyState);
  if ($$props.inputAttributes === void 0 && $$bindings.inputAttributes && inputAttributes !== void 0)
    $$bindings.inputAttributes(inputAttributes);
  if ($$props.listAutoWidth === void 0 && $$bindings.listAutoWidth && listAutoWidth !== void 0)
    $$bindings.listAutoWidth(listAutoWidth);
  if ($$props.itemHeight === void 0 && $$bindings.itemHeight && itemHeight !== void 0)
    $$bindings.itemHeight(itemHeight);
  if ($$props.Icon === void 0 && $$bindings.Icon && Icon !== void 0)
    $$bindings.Icon(Icon);
  if ($$props.iconProps === void 0 && $$bindings.iconProps && iconProps !== void 0)
    $$bindings.iconProps(iconProps);
  if ($$props.showChevron === void 0 && $$bindings.showChevron && showChevron !== void 0)
    $$bindings.showChevron(showChevron);
  if ($$props.showIndicator === void 0 && $$bindings.showIndicator && showIndicator !== void 0)
    $$bindings.showIndicator(showIndicator);
  if ($$props.containerClasses === void 0 && $$bindings.containerClasses && containerClasses !== void 0)
    $$bindings.containerClasses(containerClasses);
  if ($$props.indicatorSvg === void 0 && $$bindings.indicatorSvg && indicatorSvg !== void 0)
    $$bindings.indicatorSvg(indicatorSvg);
  if ($$props.listOffset === void 0 && $$bindings.listOffset && listOffset !== void 0)
    $$bindings.listOffset(listOffset);
  if ($$props.ClearIcon === void 0 && $$bindings.ClearIcon && ClearIcon$1 !== void 0)
    $$bindings.ClearIcon(ClearIcon$1);
  if ($$props.Item === void 0 && $$bindings.Item && Item$1 !== void 0)
    $$bindings.Item(Item$1);
  if ($$props.List === void 0 && $$bindings.List && List$1 !== void 0)
    $$bindings.List(List$1);
  if ($$props.Selection === void 0 && $$bindings.Selection && Selection$1 !== void 0)
    $$bindings.Selection(Selection$1);
  if ($$props.MultiSelection === void 0 && $$bindings.MultiSelection && MultiSelection$1 !== void 0)
    $$bindings.MultiSelection(MultiSelection$1);
  if ($$props.VirtualList === void 0 && $$bindings.VirtualList && VirtualList$1 !== void 0)
    $$bindings.VirtualList(VirtualList$1);
  if ($$props.selectedValue === void 0 && $$bindings.selectedValue && selectedValue !== void 0)
    $$bindings.selectedValue(selectedValue);
  if ($$props.handleClear === void 0 && $$bindings.handleClear && handleClear !== void 0)
    $$bindings.handleClear(handleClear);
  if ($$props.ariaValues === void 0 && $$bindings.ariaValues && ariaValues !== void 0)
    $$bindings.ariaValues(ariaValues);
  if ($$props.ariaListOpen === void 0 && $$bindings.ariaListOpen && ariaListOpen !== void 0)
    $$bindings.ariaListOpen(ariaListOpen);
  if ($$props.ariaFocused === void 0 && $$bindings.ariaFocused && ariaFocused !== void 0)
    $$bindings.ariaFocused(ariaFocused);
  $$result.css.add(css$7);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    filteredItems = filterMethod({
      loadOptions,
      filterText,
      items,
      value,
      isMulti,
      optionIdentifier,
      groupBy,
      isCreatable
    });
    {
      {
        if (selectedValue)
          console.warn("selectedValue is no longer used. Please use value instead.");
      }
    }
    {
      updateValueDisplay(items);
    }
    {
      {
        if (value)
          setValue();
      }
    }
    {
      {
        if (inputAttributes || !isSearchable)
          assignInputAttributes();
      }
    }
    {
      {
        if (isMulti) {
          setupMulti();
        }
      }
    }
    {
      {
        if (isMulti && value && value.length > 1) {
          checkValueForDuplicates();
        }
      }
    }
    {
      {
        if (value)
          dispatchSelectedItem();
      }
    }
    {
      {
        if (!value && isMulti && prev_value) {
          dispatch("select", value);
        }
      }
    }
    {
      {
        if (isFocused !== prev_isFocused) {
          setupFocus();
        }
      }
    }
    {
      {
        if (filterText !== prev_filterText) {
          setupFilterText();
        }
      }
    }
    showSelectedItem = value && filterText.length === 0;
    showClearIcon = showSelectedItem && isClearable && !isDisabled && !isWaiting;
    placeholderText = placeholderAlwaysShow && isMulti ? placeholder : value ? "" : placeholder;
    showMultiSelect = isMulti && value && value.length > 0;
    listProps = {
      Item: Item$1,
      filterText,
      optionIdentifier,
      noOptionsMessage,
      hideEmptyState,
      isVirtualList,
      VirtualList: VirtualList$1,
      value,
      isMulti,
      getGroupHeaderLabel,
      items: filteredItems,
      itemHeight,
      getOptionLabel,
      listPlacement,
      parent: container,
      listAutoWidth,
      listOffset
    };
    ariaSelection = value ? handleAriaSelection() : "";
    ariaContext = handleAriaContent();
    $$rendered = `

<div class="${[
      "selectContainer " + escape2(containerClasses) + " svelte-17l1npl",
      (hasError ? "hasError" : "") + " " + (isMulti ? "multiSelect" : "") + " " + (isDisabled ? "disabled" : "") + " " + (isFocused ? "focused" : "")
    ].join(" ").trim()}"${add_attribute("style", containerStyles, 0)}${add_attribute("this", container, 0)}><span aria-live="${"polite"}" aria-atomic="${"false"}" aria-relevant="${"additions text"}" class="${"a11yText svelte-17l1npl"}">${isFocused ? `<span id="${"aria-selection"}">${escape2(ariaSelection)}</span>
            <span id="${"aria-context"}">${escape2(ariaContext)}</span>` : ``}</span>

    ${Icon ? `${validate_component(Icon || missing_component, "svelte:component").$$render($$result, Object_1.assign(iconProps), {}, {})}` : ``}

    ${showMultiSelect ? `${validate_component(MultiSelection$1 || missing_component, "svelte:component").$$render($$result, {
      value,
      getSelectionLabel,
      activeValue,
      isDisabled,
      multiFullItemClearable
    }, {}, {})}` : ``}

    <input${spread([
      { readonly: !isSearchable || null },
      escape_object(_inputAttributes),
      {
        placeholder: escape_attribute_value(placeholderText)
      },
      {
        style: escape_attribute_value(inputStyles)
      },
      { disabled: isDisabled || null }
    ], "svelte-17l1npl")}${add_attribute("this", input, 0)}${add_attribute("value", filterText, 0)}>

    ${!isMulti && showSelectedItem ? `<div class="${"selectedItem svelte-17l1npl"}">${validate_component(Selection$1 || missing_component, "svelte:component").$$render($$result, { item: value, getSelectionLabel }, {}, {})}</div>` : ``}

    ${showClearIcon ? `<div class="${"clearSelect svelte-17l1npl"}" aria-hidden="${"true"}">${validate_component(ClearIcon$1 || missing_component, "svelte:component").$$render($$result, {}, {}, {})}</div>` : ``}

    ${!showClearIcon && (showIndicator || showChevron && !value || !isSearchable && !isDisabled && !isWaiting && (showSelectedItem && !isClearable || !showSelectedItem)) ? `<div class="${"indicator svelte-17l1npl"}" aria-hidden="${"true"}">${indicatorSvg ? `<!-- HTML_TAG_START -->${indicatorSvg}<!-- HTML_TAG_END -->` : `<svg width="${"100%"}" height="${"100%"}" viewBox="${"0 0 20 20"}" focusable="${"false"}" aria-hidden="${"true"}" class="${"svelte-17l1npl"}"><path d="${"M4.516 7.548c0.436-0.446 1.043-0.481 1.576 0l3.908 3.747\n          3.908-3.747c0.533-0.481 1.141-0.446 1.574 0 0.436 0.445 0.408 1.197 0\n          1.615-0.406 0.418-4.695 4.502-4.695 4.502-0.217 0.223-0.502\n          0.335-0.787 0.335s-0.57-0.112-0.789-0.335c0\n          0-4.287-4.084-4.695-4.502s-0.436-1.17 0-1.615z"}"></path></svg>`}</div>` : ``}

    ${isWaiting ? `<div class="${"spinner svelte-17l1npl"}"><svg class="${"spinner_icon svelte-17l1npl"}" viewBox="${"25 25 50 50"}"><circle class="${"spinner_path svelte-17l1npl"}" cx="${"50"}" cy="${"50"}" r="${"20"}" fill="${"none"}" stroke="${"currentColor"}" stroke-width="${"5"}" stroke-miterlimit="${"10"}"></circle></svg></div>` : ``}

    ${listOpen ? `${validate_component(List$1 || missing_component, "svelte:component").$$render($$result, Object_1.assign(listProps, { hoverItemIndex }), {
      hoverItemIndex: ($$value) => {
        hoverItemIndex = $$value;
        $$settled = false;
      }
    }, {})}` : ``}

    ${!isMulti || isMulti && !showMultiSelect ? `<input${add_attribute("name", inputAttributes.name, 0)} type="${"hidden"}"${add_attribute("value", value ? getSelectionLabel(value) : null, 0)} class="${"svelte-17l1npl"}">` : ``}

    ${isMulti && showMultiSelect ? `${each(value, (item) => `<input${add_attribute("name", inputAttributes.name, 0)} type="${"hidden"}"${add_attribute("value", item ? getSelectionLabel(item) : null, 0)} class="${"svelte-17l1npl"}">`)}` : ``}</div>`;
  } while (!$$settled);
  return $$rendered;
});
var css$6 = {
  code: ".selectContainer{width:100%;font-size:14px}.selectContainer input::placeholder{color:white;opacity:.45;font-weight:200}:root{--border:none;--background:none;--padding:0 var(--gap);--inputPadding:0 var(--gap);--height:calc(var(--gap) * 2.5);--listBackground:rgb(var(--c-background-darker));--listBorderRadius:var(--gbr);--listBorder:1px solid rgb(var(--c-border));--listShadow:0 2px 4px rgba(0, 0, 0, .25);--itemHoverBG:rgb(var(--c-accent-blue));--itemFirstBorderRadius:var(--gbr) var(--gbr) 0 0;--itemLastBorderRadius:0 0 var(--gbr) var(--gbr)}",
  map: `{"version":3,"file":"Autocomplete.svelte","sources":["Autocomplete.svelte"],"sourcesContent":["<script>\\n  import Select from 'svelte-select';\\n  import { onMount, createEventDispatcher } from 'svelte';\\n\\n  export let list;\\n  export let placeholder = 'Choose...';\\n\\n  export let value;\\n  export let isCreatable = false;\\n\\n  let type;\\n\\n\\n  const dispatch = createEventDispatcher();\\n\\n  onMount( () => {\\n    const example = list[0];\\n    type = example.type;\\n    switch( type ) {\\n      case 'accounts':\\n        list = list.map( item => { return { value: item.id, label: item.attributes.displayName } } );\\n      break;\\n      case 'categories':\\n        list = list.map( item => { return { value: item.id, label: item.attributes.name } } );\\n      break;\\n      case 'tags':\\n        list = list.map( item => { return { value: item.id, label: item.id } } );\\n      break;\\n    }\\n  } );\\n\\n  const select = e => dispatch( 'select', Object.assign( e.detail, { type: type } ) );\\n  const clear = () => dispatch( 'select', { type: type } );\\n<\/script>\\n\\n<style>\\n  :global(.selectContainer) {\\n    width: 100%;\\n    font-size: 14px;\\n  }\\n  :global(.selectContainer input::placeholder) {\\n    color: white;\\n    opacity: .45;\\n    font-weight: 200;\\n  }\\n\\n  :root {\\n    --border: none;\\n    --background: none;\\n    --padding: 0 var(--gap);\\n    --inputPadding: 0 var(--gap);\\n\\n    --height: calc(var(--gap) * 2.5);\\n\\n    --listBackground: rgb(var(--c-background-darker));\\n    --listBorderRadius: var(--gbr);\\n    --listBorder: 1px solid rgb(var(--c-border));\\n    --listShadow: 0 2px 4px rgba(0, 0, 0, .25);\\n\\n    --itemHoverBG: rgb(var(--c-accent-blue));\\n    --itemFirstBorderRadius: var(--gbr) var(--gbr) 0 0;\\n    --itemLastBorderRadius: 0 0 var(--gbr) var(--gbr);\\n  }\\n</style>\\n\\n<Select items={list} {placeholder} bind:value={value} on:select={select} on:clear={clear} {isCreatable} />\\n"],"names":[],"mappings":"AAoCU,gBAAgB,AAAE,CAAC,AACzB,KAAK,CAAE,IAAI,CACX,SAAS,CAAE,IAAI,AACjB,CAAC,AACO,mCAAmC,AAAE,CAAC,AAC5C,KAAK,CAAE,KAAK,CACZ,OAAO,CAAE,GAAG,CACZ,WAAW,CAAE,GAAG,AAClB,CAAC,AAED,KAAK,AAAC,CAAC,AACL,QAAQ,CAAE,IAAI,CACd,YAAY,CAAE,IAAI,CAClB,SAAS,CAAE,YAAY,CACvB,cAAc,CAAE,YAAY,CAE5B,QAAQ,CAAE,sBAAsB,CAEhC,gBAAgB,CAAE,+BAA+B,CACjD,kBAAkB,CAAE,UAAU,CAC9B,YAAY,CAAE,8BAA8B,CAC5C,YAAY,CAAE,4BAA4B,CAE1C,aAAa,CAAE,yBAAyB,CACxC,uBAAuB,CAAE,yBAAyB,CAClD,sBAAsB,CAAE,yBAAyB,AACnD,CAAC"}`
};
var Autocomplete = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let { list } = $$props;
  let { placeholder = "Choose..." } = $$props;
  let { value } = $$props;
  let { isCreatable = false } = $$props;
  createEventDispatcher();
  if ($$props.list === void 0 && $$bindings.list && list !== void 0)
    $$bindings.list(list);
  if ($$props.placeholder === void 0 && $$bindings.placeholder && placeholder !== void 0)
    $$bindings.placeholder(placeholder);
  if ($$props.value === void 0 && $$bindings.value && value !== void 0)
    $$bindings.value(value);
  if ($$props.isCreatable === void 0 && $$bindings.isCreatable && isCreatable !== void 0)
    $$bindings.isCreatable(isCreatable);
  $$result.css.add(css$6);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `${validate_component(Select, "Select").$$render($$result, {
      items: list,
      placeholder,
      isCreatable,
      value
    }, {
      value: ($$value) => {
        value = $$value;
        $$settled = false;
      }
    }, {})}`;
  } while (!$$settled);
  return $$rendered;
});
var css$5 = {
  code: "h5.svelte-ct8qkp{color:rgb(var(--c-accent));text-transform:none;text-shadow:0 0 4px rgba(var(--c-accent), .65)}.debug.svelte-ct8qkp{font-family:var(--mono-font);font-size:.8em;background:rgba(var(--c-overlay));-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-radius:var(--gbr);overflow:scroll;max-width:100%;padding:16px;margin-bottom:0}.debug[data-stuck=true].svelte-ct8qkp{position:sticky;bottom:0;max-height:25vh;overflow:auto;z-index:3}",
  map: `{"version":3,"file":"Debug.svelte","sources":["Debug.svelte"],"sourcesContent":["<script>\\n  import { u } from '$lib/store';\\n\\n  export let content;\\n  export let title = '';\\n  export let sticky = true;\\n<\/script>\\n\\n<style>\\n  h5 {\\n    color: rgb(var(--c-accent));\\n    text-transform: none;\\n    text-shadow: 0 0 4px rgba(var(--c-accent), .65);\\n  }\\n\\n  .debug {\\n    font-family: var(--mono-font);\\n    font-size: .8em;\\n    background: rgba(var(--c-overlay));\\n    -webkit-backdrop-filter: blur(12px);\\n    backdrop-filter: blur(12px);\\n    border-radius: var(--gbr);\\n    overflow: scroll;\\n    max-width: 100%;\\n    padding: 16px;\\n    margin-bottom: 0;\\n  }\\n\\n  .debug[data-stuck=true] {\\n    position: sticky;\\n    bottom: 0;\\n    max-height: 25vh;\\n    overflow: auto;\\n    z-index: 3;\\n  }\\n</style>\\n\\n{#if $u.debug}\\n  <pre class=\\"debug\\" data-stuck={sticky}>\\n    {#if title}<h5>{title}</h5>{/if}{ JSON.stringify( content, null, 2 ) }\\n  </pre>\\n{/if}\\n"],"names":[],"mappings":"AASE,EAAE,cAAC,CAAC,AACF,KAAK,CAAE,IAAI,IAAI,UAAU,CAAC,CAAC,CAC3B,cAAc,CAAE,IAAI,CACpB,WAAW,CAAE,CAAC,CAAC,CAAC,CAAC,GAAG,CAAC,KAAK,IAAI,UAAU,CAAC,CAAC,CAAC,GAAG,CAAC,AACjD,CAAC,AAED,MAAM,cAAC,CAAC,AACN,WAAW,CAAE,IAAI,WAAW,CAAC,CAC7B,SAAS,CAAE,IAAI,CACf,UAAU,CAAE,KAAK,IAAI,WAAW,CAAC,CAAC,CAClC,uBAAuB,CAAE,KAAK,IAAI,CAAC,CACnC,eAAe,CAAE,KAAK,IAAI,CAAC,CAC3B,aAAa,CAAE,IAAI,KAAK,CAAC,CACzB,QAAQ,CAAE,MAAM,CAChB,SAAS,CAAE,IAAI,CACf,OAAO,CAAE,IAAI,CACb,aAAa,CAAE,CAAC,AAClB,CAAC,AAED,MAAM,CAAC,UAAU,CAAC,IAAI,CAAC,cAAC,CAAC,AACvB,QAAQ,CAAE,MAAM,CAChB,MAAM,CAAE,CAAC,CACT,UAAU,CAAE,IAAI,CAChB,QAAQ,CAAE,IAAI,CACd,OAAO,CAAE,CAAC,AACZ,CAAC"}`
};
var Debug = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $u, $$unsubscribe_u;
  $$unsubscribe_u = subscribe(u, (value) => $u = value);
  let { content } = $$props;
  let { title = "" } = $$props;
  let { sticky = true } = $$props;
  if ($$props.content === void 0 && $$bindings.content && content !== void 0)
    $$bindings.content(content);
  if ($$props.title === void 0 && $$bindings.title && title !== void 0)
    $$bindings.title(title);
  if ($$props.sticky === void 0 && $$bindings.sticky && sticky !== void 0)
    $$bindings.sticky(sticky);
  $$result.css.add(css$5);
  $$unsubscribe_u();
  return `${$u.debug ? `<pre class="${"debug svelte-ct8qkp"}"${add_attribute("data-stuck", sticky, 0)}>${title ? `<h5 class="${"svelte-ct8qkp"}">${escape2(title)}</h5>` : ``}${escape2(JSON.stringify(content, null, 2))}</pre>` : ``}`;
});
var css$4 = {
  code: "main.svelte-aneqnd.svelte-aneqnd{background:rgb(var(--c-background));border-radius:0 0 var(--gbr) var(--gbr);position:relative}.date-picker.svelte-aneqnd.svelte-aneqnd{background:rgb(var(--c-background));display:flex;flex-flow:row nowrap}.date-picker.svelte-aneqnd input.svelte-aneqnd{margin:0;border:none;padding:var(--gap);background:none;font-size:14px;height:40px}.date-picker.svelte-aneqnd input.svelte-aneqnd::placeholder{opacity:.45;font-weight:200;color:rgb(var(--c-white))}header.svelte-aneqnd.svelte-aneqnd{display:flex;justify-content:space-between;align-items:center}header.svelte-aneqnd h5.svelte-aneqnd{margin:0}header.svelte-aneqnd button.svelte-aneqnd{margin:0;padding:0;border:none;background:none;cursor:pointer;color:white;font-size:var(--font-small);text-decoration:underline;opacity:.25}header.svelte-aneqnd button.svelte-aneqnd:hover{opacity:1}",
  map: `{"version":3,"file":"Filter.svelte","sources":["Filter.svelte"],"sourcesContent":["<script>\\n  import FlatPickr from 'svelte-flatpickr';\\n  import 'flatpickr/dist/flatpickr.css';\\n\\n  import { createEventDispatcher } from 'svelte';\\n\\n  import Box from '$lib/Box.svelte';\\n  import Autocomplete from '$lib/Autocomplete.svelte';\\n  import Debug from '$lib/Debug.svelte';\\n\\n  import { tags, categories } from '$lib/store';\\n  import { iso_date, log } from '$lib/helpers';\\n\\n  import '../flatpickr.css';\\n\\n  const flatpickr_options = {\\n    mode: 'range',\\n    maxDate: new Date(),\\n    altInput: true,\\n    altFormat: 'j M Y',\\n    monthSelectorType: 'static'\\n  };\\n\\n  const dispatch = createEventDispatcher();\\n\\n  export let filters = {};\\n  let local_filters = {}, temp_filters = {};\\n\\n  let dates = [], category = '', tag = '';\\n\\n  export const clear_filters = ( auto_apply = true ) => {\\n    dates = [];\\n    category = '';\\n    tag = '';\\n    filters = {};\\n    local_filters = {};\\n    temp_filters = {};\\n    auto_apply && apply_filters();\\n  }\\n\\n\\n  let choose_taxonomy = chosen => {\\n\\n    chosen = chosen.detail;\\n\\n    if( 'categories' === chosen.type ) chosen.type = 'category';\\n    if( 'tags' === chosen.type ) chosen.type = 'tag';\\n\\n    if ( chosen.value ) {\\n      log( 'Applying taxonomy filter', chosen.type, chosen.value );\\n      local_filters[\`filter[\${chosen.type}]\`] = chosen.value;\\n    } else {\\n      log( 'Clearing taxonomy filter', chosen.type );\\n      delete local_filters[\`filter[\${chosen.type}]\`];\\n      local_filters = local_filters;\\n    }\\n\\n    apply_filters();\\n\\n  }\\n\\n  const choose_dates = chosen => {\\n    const dates = chosen.detail[0];\\n    if( dates.length === 2 ) {\\n      log( 'Applying date filters' );\\n      local_filters['filter[since]'] = iso_date( dates[0], 0, 0, 0 );\\n      local_filters['filter[until]'] = iso_date( dates[1], 23, 59, 59 );\\n      apply_filters();\\n    } else if ( dates.length === 0 ) {\\n      log( 'Clearing date filters' );\\n      delete local_filters['filter[since]'];\\n      delete local_filters['filter[until]'];\\n      apply_filters();\\n    } else {\\n      log( 'Not enough dates for a filter action either way' );\\n    }\\n  }\\n\\n  const apply_filters = () => {\\n    log( 'Applying filters' );\\n    temp_filters = {};\\n\\n    // Run through the filters and transform them into an object the UP API will accept\\n    Object.keys( local_filters ).forEach( f => {\\n      const val = local_filters[f];\\n      if( typeof local_filters[f] === 'object' && local_filters[f] !== null ) {\\n        temp_filters[f] = val.value;\\n      } else if ( val ) {\\n        temp_filters[f] = val;\\n      }\\n    } );\\n    filters = temp_filters;\\n    dispatch( 'applied_filters' );\\n  };\\n<\/script>\\n\\n<style>\\n\\n  main {\\n    background: rgb(var(--c-background));\\n    border-radius: 0 0 var(--gbr) var(--gbr);\\n    position: relative;\\n  }\\n\\n  .date-picker {\\n    background: rgb(var(--c-background));\\n    display: flex;\\n    flex-flow: row nowrap;\\n  }\\n  .date-picker input {\\n    margin: 0;\\n    border: none;\\n    padding: var(--gap);\\n    background: none;\\n    font-size: 14px;\\n    height: 40px;\\n  }\\n  .date-picker input::placeholder {\\n    opacity: .45;\\n    font-weight: 200;\\n    color: rgb(var(--c-white));\\n  }\\n\\n  header {\\n    display: flex;\\n    justify-content: space-between;\\n    align-items: center;\\n  }\\n  header h5 {\\n    margin: 0;\\n  }\\n  header button {\\n    margin: 0;\\n\\n    padding: 0;\\n    border: none;\\n\\n    background: none;\\n\\n    cursor: pointer;\\n\\n    color: white;\\n    font-size: var(--font-small);\\n    text-decoration: underline;\\n\\n    opacity: .25;\\n  }\\n  header button:hover {\\n    opacity: 1;\\n  }\\n\\n</style>\\n\\n<header>\\n  <h5>Filter transactions:</h5>\\n  {#if filters && Object.values( filters ).some( a => a )}\\n  <button on:click={clear_filters}>Clear filters</button>\\n  {/if}\\n</header>\\n\\n<Box title=\\"Date range:\\">\\n  <main class=\\"dates\\">\\n    <FlatPickr options={flatpickr_options} bind:value={dates} on:change={choose_dates} placeholder=\\"Choose dates\\" element=\\".date-picker\\">\\n      <div class=\\"date-picker\\">\\n        <input type=\\"text\\" placeholder=\\"Select dates...\\" data-input>\\n        <button aria-label=\\"Clear selected dates\\" class=\\"button  icon\\" data-clear hidden={dates.length === 0}><i class=\\"fas fa-times\\"></i></button>\\n      </div>\\n    </FlatPickr>\\n  </main>\\n</Box>\\n<Box title=\\"Category:\\">\\n  <main>\\n    <Autocomplete on:select={choose_taxonomy} list={$categories} bind:value={category} placeholder=\\"Choose a category\\" />\\n  </main>\\n</Box>\\n<Box title=\\"Tag:\\">\\n  <main>\\n    <Autocomplete on:select={choose_taxonomy} list={$tags} bind:value={tag} placeholder=\\"Choose a tag\\" />\\n  </main>\\n</Box>\\n\\n<Debug title=\\"Current filters:\\" content={filters} />\\n"],"names":[],"mappings":"AAkGE,IAAI,4BAAC,CAAC,AACJ,UAAU,CAAE,IAAI,IAAI,cAAc,CAAC,CAAC,CACpC,aAAa,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,IAAI,KAAK,CAAC,CACxC,QAAQ,CAAE,QAAQ,AACpB,CAAC,AAED,YAAY,4BAAC,CAAC,AACZ,UAAU,CAAE,IAAI,IAAI,cAAc,CAAC,CAAC,CACpC,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,AACvB,CAAC,AACD,0BAAY,CAAC,KAAK,cAAC,CAAC,AAClB,MAAM,CAAE,CAAC,CACT,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,IAAI,KAAK,CAAC,CACnB,UAAU,CAAE,IAAI,CAChB,SAAS,CAAE,IAAI,CACf,MAAM,CAAE,IAAI,AACd,CAAC,AACD,0BAAY,CAAC,mBAAK,aAAa,AAAC,CAAC,AAC/B,OAAO,CAAE,GAAG,CACZ,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,AAC5B,CAAC,AAED,MAAM,4BAAC,CAAC,AACN,OAAO,CAAE,IAAI,CACb,eAAe,CAAE,aAAa,CAC9B,WAAW,CAAE,MAAM,AACrB,CAAC,AACD,oBAAM,CAAC,EAAE,cAAC,CAAC,AACT,MAAM,CAAE,CAAC,AACX,CAAC,AACD,oBAAM,CAAC,MAAM,cAAC,CAAC,AACb,MAAM,CAAE,CAAC,CAET,OAAO,CAAE,CAAC,CACV,MAAM,CAAE,IAAI,CAEZ,UAAU,CAAE,IAAI,CAEhB,MAAM,CAAE,OAAO,CAEf,KAAK,CAAE,KAAK,CACZ,SAAS,CAAE,IAAI,YAAY,CAAC,CAC5B,eAAe,CAAE,SAAS,CAE1B,OAAO,CAAE,GAAG,AACd,CAAC,AACD,oBAAM,CAAC,oBAAM,MAAM,AAAC,CAAC,AACnB,OAAO,CAAE,CAAC,AACZ,CAAC"}`
};
var Filter = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $categories, $$unsubscribe_categories;
  let $tags, $$unsubscribe_tags;
  $$unsubscribe_categories = subscribe(categories$1, (value) => $categories = value);
  $$unsubscribe_tags = subscribe(tags, (value) => $tags = value);
  const flatpickr_options = {
    mode: "range",
    maxDate: new Date(),
    altInput: true,
    altFormat: "j M Y",
    monthSelectorType: "static"
  };
  const dispatch = createEventDispatcher();
  let { filters = {} } = $$props;
  let local_filters = {}, temp_filters = {};
  let dates = [], category = "", tag = "";
  const clear_filters = (auto_apply = true) => {
    dates = [];
    category = "";
    tag = "";
    filters = {};
    local_filters = {};
    temp_filters = {};
    auto_apply && apply_filters();
  };
  const apply_filters = () => {
    log("Applying filters");
    temp_filters = {};
    Object.keys(local_filters).forEach((f) => {
      const val = local_filters[f];
      if (typeof local_filters[f] === "object" && local_filters[f] !== null) {
        temp_filters[f] = val.value;
      } else if (val) {
        temp_filters[f] = val;
      }
    });
    filters = temp_filters;
    dispatch("applied_filters");
  };
  if ($$props.filters === void 0 && $$bindings.filters && filters !== void 0)
    $$bindings.filters(filters);
  if ($$props.clear_filters === void 0 && $$bindings.clear_filters && clear_filters !== void 0)
    $$bindings.clear_filters(clear_filters);
  $$result.css.add(css$4);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `<header class="${"svelte-aneqnd"}"><h5 class="${"svelte-aneqnd"}">Filter transactions:</h5>
  ${filters && Object.values(filters).some((a) => a) ? `<button class="${"svelte-aneqnd"}">Clear filters</button>` : ``}</header>

${validate_component(Box, "Box").$$render($$result, { title: "Date range:" }, {}, {
      default: () => `<main class="${"dates svelte-aneqnd"}">${validate_component(Flatpickr, "FlatPickr").$$render($$result, {
        options: flatpickr_options,
        placeholder: "Choose dates",
        element: ".date-picker",
        value: dates
      }, {
        value: ($$value) => {
          dates = $$value;
          $$settled = false;
        }
      }, {
        default: () => `<div class="${"date-picker svelte-aneqnd"}"><input type="${"text"}" placeholder="${"Select dates..."}" data-input class="${"svelte-aneqnd"}">
        <button aria-label="${"Clear selected dates"}" class="${"button icon"}" data-clear ${dates.length === 0 ? "hidden" : ""}><i class="${"fas fa-times"}"></i></button></div>`
      })}</main>`
    })}
${validate_component(Box, "Box").$$render($$result, { title: "Category:" }, {}, {
      default: () => `<main class="${"svelte-aneqnd"}">${validate_component(Autocomplete, "Autocomplete").$$render($$result, {
        list: $categories,
        placeholder: "Choose a category",
        value: category
      }, {
        value: ($$value) => {
          category = $$value;
          $$settled = false;
        }
      }, {})}</main>`
    })}
${validate_component(Box, "Box").$$render($$result, { title: "Tag:" }, {}, {
      default: () => `<main class="${"svelte-aneqnd"}">${validate_component(Autocomplete, "Autocomplete").$$render($$result, {
        list: $tags,
        placeholder: "Choose a tag",
        value: tag
      }, {
        value: ($$value) => {
          tag = $$value;
          $$settled = false;
        }
      }, {})}</main>`
    })}

${validate_component(Debug, "Debug").$$render($$result, {
      title: "Current filters:",
      content: filters
    }, {}, {})}`;
  } while (!$$settled);
  $$unsubscribe_categories();
  $$unsubscribe_tags();
  return $$rendered;
});
var css$3 = {
  code: "ul.svelte-3gufk3{list-style:none;margin:0;padding:0 12px;display:flex;flex-flow:row wrap;align-items:stretch}li.svelte-3gufk3{background:rgb(var(--c-brand));border-radius:calc(var(--gbr) / 2);padding:0 8px;margin:calc(var(--gap) / 4);color:rgb(var(--c-white));font-size:var(--font-small);display:flex;flex-flow:row;align-items:center}li.add.svelte-3gufk3{background:none;padding:0;margin:0;min-width:calc(var(--gap) * 16)}li.add.svelte-3gufk3:first-child{margin-left:-12px}button.svelte-3gufk3{margin-left:6px;color:inherit;background:none;border:none;padding:0;width:1em;height:1em;position:relative}button.svelte-3gufk3::before,button.svelte-3gufk3::after{content:'';width:2px;height:8px;position:absolute;top:50%;left:70%;background:rgb(var(--c-white))}button.svelte-3gufk3::before{transform:translate(-50%,-50%) rotate(-45deg)}button.svelte-3gufk3::after{transform:translate(-50%,-50%) rotate(45deg)}",
  map: `{"version":3,"file":"Tags.svelte","sources":["Tags.svelte"],"sourcesContent":["<script>\\n  import Autocomplete from '$lib/Autocomplete.svelte';\\n\\n  import { createEventDispatcher } from 'svelte';\\n  import { slugify } from '$lib/helpers';\\n  import { tags } from '$lib/store';\\n\\n  export let selected;\\n\\n  const dispatch = createEventDispatcher();\\n\\n  const add_tag = () => {\\n    const added_tag = {\\n      id: slugify( new_tag ),\\n      label: new_tag\\n    };\\n    selected = [...selected, added_tag];\\n    dispatch( 'add', { tag: added_tag } );\\n    new_tag = '';\\n  }\\n\\n  const remove_tag = id => {\\n    selected = selected.filter( tag => tag.id !== id );\\n    dispatch( 'remove', { tag: { id: id } } );\\n  }\\n\\n  let new_tag = '';\\n<\/script>\\n\\n<style>\\n\\n  ul {\\n    list-style: none;\\n    margin: 0;\\n    padding: 0 12px;\\n    display: flex;\\n    flex-flow: row wrap;\\n    align-items: stretch;\\n  }\\n\\n  li {\\n    background: rgb(var(--c-brand));\\n    border-radius: calc(var(--gbr) / 2);\\n    padding: 0 8px;\\n    margin: calc(var(--gap) / 4);\\n    color: rgb(var(--c-white));\\n    font-size: var(--font-small);\\n\\n    display: flex;\\n    flex-flow: row;\\n    align-items: center;\\n  }\\n  li.add {\\n    background: none;\\n    padding: 0;\\n    margin: 0;\\n    min-width: calc(var(--gap) * 16);\\n  }\\n  li.add:first-child {\\n    margin-left: -12px;\\n  }\\n\\n  button {\\n    margin-left: 6px;\\n    color: inherit;\\n    background: none;\\n    border: none;\\n    padding: 0;\\n    width: 1em;\\n    height: 1em;\\n    position: relative;\\n  }\\n  button::before, button::after {\\n    content: '';\\n    width: 2px;\\n    height: 8px;\\n    position: absolute;\\n    top: 50%;\\n    left: 70%;\\n    background: rgb(var(--c-white));\\n  }\\n  button::before {\\n    transform: translate(-50%,-50%) rotate(-45deg);\\n  }\\n  button::after {\\n    transform: translate(-50%,-50%) rotate(45deg);\\n  }\\n</style>\\n\\n<form on:submit|preventDefault={add_tag}>\\n  <ul>\\n    {#each selected as tag}<li>\\n      <span>{tag.id}</span>\\n      <button type=\\"button\\" on:click={() => remove_tag( tag.id )}></button>\\n    </li>{/each}\\n    {#if selected.length < 6}<li class=\\"add\\">\\n      <Autocomplete list={$tags} bind:value={new_tag} placeholder=\\"Add a tag...\\" isCreatable=\\"true\\" />\\n    </li>{/if}\\n  </ul>\\n</form>\\n"],"names":[],"mappings":"AA+BE,EAAE,cAAC,CAAC,AACF,UAAU,CAAE,IAAI,CAChB,MAAM,CAAE,CAAC,CACT,OAAO,CAAE,CAAC,CAAC,IAAI,CACf,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,IAAI,CACnB,WAAW,CAAE,OAAO,AACtB,CAAC,AAED,EAAE,cAAC,CAAC,AACF,UAAU,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC/B,aAAa,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CACnC,OAAO,CAAE,CAAC,CAAC,GAAG,CACd,MAAM,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAC5B,KAAK,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC1B,SAAS,CAAE,IAAI,YAAY,CAAC,CAE5B,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CACd,WAAW,CAAE,MAAM,AACrB,CAAC,AACD,EAAE,IAAI,cAAC,CAAC,AACN,UAAU,CAAE,IAAI,CAChB,OAAO,CAAE,CAAC,CACV,MAAM,CAAE,CAAC,CACT,SAAS,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,AAClC,CAAC,AACD,EAAE,kBAAI,YAAY,AAAC,CAAC,AAClB,WAAW,CAAE,KAAK,AACpB,CAAC,AAED,MAAM,cAAC,CAAC,AACN,WAAW,CAAE,GAAG,CAChB,KAAK,CAAE,OAAO,CACd,UAAU,CAAE,IAAI,CAChB,MAAM,CAAE,IAAI,CACZ,OAAO,CAAE,CAAC,CACV,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,CACX,QAAQ,CAAE,QAAQ,AACpB,CAAC,AACD,oBAAM,QAAQ,CAAE,oBAAM,OAAO,AAAC,CAAC,AAC7B,OAAO,CAAE,EAAE,CACX,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,CACX,QAAQ,CAAE,QAAQ,CAClB,GAAG,CAAE,GAAG,CACR,IAAI,CAAE,GAAG,CACT,UAAU,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,AACjC,CAAC,AACD,oBAAM,QAAQ,AAAC,CAAC,AACd,SAAS,CAAE,UAAU,IAAI,CAAC,IAAI,CAAC,CAAC,OAAO,MAAM,CAAC,AAChD,CAAC,AACD,oBAAM,OAAO,AAAC,CAAC,AACb,SAAS,CAAE,UAAU,IAAI,CAAC,IAAI,CAAC,CAAC,OAAO,KAAK,CAAC,AAC/C,CAAC"}`
};
var Tags = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $tags, $$unsubscribe_tags;
  $$unsubscribe_tags = subscribe(tags, (value) => $tags = value);
  let { selected } = $$props;
  createEventDispatcher();
  let new_tag = "";
  if ($$props.selected === void 0 && $$bindings.selected && selected !== void 0)
    $$bindings.selected(selected);
  $$result.css.add(css$3);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    $$rendered = `<form><ul class="${"svelte-3gufk3"}">${each(selected, (tag) => `<li class="${"svelte-3gufk3"}"><span>${escape2(tag.id)}</span>
      <button type="${"button"}" class="${"svelte-3gufk3"}"></button>
    </li>`)}
    ${selected.length < 6 ? `<li class="${"add svelte-3gufk3"}">${validate_component(Autocomplete, "Autocomplete").$$render($$result, {
      list: $tags,
      placeholder: "Add a tag...",
      isCreatable: "true",
      value: new_tag
    }, {
      value: ($$value) => {
        new_tag = $$value;
        $$settled = false;
      }
    }, {})}</li>` : ``}</ul></form>`;
  } while (!$$settled);
  $$unsubscribe_tags();
  return $$rendered;
});
var Transactions = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $$unsubscribe_tags;
  $$unsubscribe_tags = subscribe(tags, (value) => value);
  let { account } = $$props;
  let { txs } = $$props;
  let sorted_tx = [];
  const sort_tx = (input_tx) => {
    sorted_tx = [];
    Object.keys(input_tx).forEach((id) => {
      let tx = input_tx[id];
      let dayref = tx.attributes.createdAt.split("T")[0];
      let matched_date = sorted_tx.findIndex((date) => date.dayref === dayref);
      if (matched_date < 0) {
        sorted_tx.push({ dayref, tx: [], open: true });
        matched_date = sorted_tx.length - 1;
      }
      sorted_tx[matched_date].tx = [...sorted_tx[matched_date].tx, tx];
    });
  };
  const available_columns = {
    time: {
      label: "Time",
      data: "attributes.createdAt",
      process: (data) => new Date(data).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })
    },
    description: {
      label: "Description",
      type: "th",
      data: "attributes.description"
    },
    amount: {
      label: "Amount",
      data: "attributes.amount.value",
      process: (data) => {
        let amt = parseFloat(data);
        return `<div>${amt > 0 ? "+ " : ""}${format2.currency(Math.abs(amt))}</div>`;
      }
    },
    status: {
      label: "Status",
      data: "attributes.status"
    }
  };
  const default_columns = ["time", "description", "amount"];
  let columns = default_columns;
  columns = columns.map((col) => {
    let column = available_columns[col];
    column.name = col;
    return column;
  });
  const total = (txs2) => txs2.reduce((prev, curr) => {
    let val = parseFloat(curr.attributes.amount.value);
    return val >= 0 || curr.relationships.transferAccount.data ? prev : prev + Math.abs(val);
  }, 0);
  if ($$props.account === void 0 && $$bindings.account && account !== void 0)
    $$bindings.account(account);
  if ($$props.txs === void 0 && $$bindings.txs && txs !== void 0)
    $$bindings.txs(txs);
  {
    sort_tx(txs);
  }
  $$unsubscribe_tags();
  return `${sorted_tx ? `<table><thead><tr>${each(columns, (col) => `
      <th scope="${"col"}"${add_attribute("data-col", col.name, 0)}>${escape2(col.label)}</th>
    `)}</tr></thead>

  ${each(sorted_tx, (d2, i) => `<tbody${add_attribute("data-open", d2.open, 0)}>${i > 0 ? `<tr><td class="${"spacer"}"${add_attribute("colspan", columns.length, 0)}>\xA0</td></tr>` : ``}

    <tr class="${"day-header"}"><th scope="${"rowgroup"}"${add_attribute("colspan", columns.length, 0)}><h5>${escape2(format2.date(d2.dayref))}</h5>
      </th></tr>

  ${d2.open ? `${each(d2.tx, (tx) => `
    <tr class="${"tx"}"${add_attribute("data-open", tx.more_detail, 0)}>${each(columns, (col) => `
      ${col.type === "th" ? `<th scope="${"row"}"${add_attribute("aria-label", col.label, 0)}${add_attribute("data-col", col.name, 0)}><!-- HTML_TAG_START -->${col.process ? col.process((0, import_object_resolve_path.default)(tx, col.data)) : (0, import_object_resolve_path.default)(tx, col.data)}<!-- HTML_TAG_END -->
      </th>` : `<td${add_attribute("aria-label", col.label, 0)}${add_attribute("data-col", col.name, 0)}><!-- HTML_TAG_START -->${col.process ? col.process((0, import_object_resolve_path.default)(tx, col.data)) : (0, import_object_resolve_path.default)(tx, col.data)}<!-- HTML_TAG_END -->
      </td>`}
    `)}</tr>

    ${tx.more_detail ? `<tr><td${add_attribute("colspan", columns.length, 0)} class="${"more-detail"}"><div><aside class="${"main"}"><div class="${"datum large"}"><header><h5>Merchant/payee:</h5></header>
            <main><h3>${escape2(tx.attributes.rawText || tx.attributes.description)}</h3>
            </main></div>

            <div class="${"datum"}"><header><h5>Category:</h5></header>
              <main>${tx.relationships.parentCategory.data ? `${escape2(get_category(tx.relationships.parentCategory.data.id).attributes.name)} /` : ``}
                ${tx.relationships.category.data ? `${escape2(get_category(tx.relationships.category.data.id).attributes.name)}` : `<em>None</em>`}
              </main></div>

          ${tx.attributes.message ? `<div class="${"datum xl"}"><header><h5>Transfer message</h5></header>
              <main>${escape2(tx.attributes.message)}</main>
            </div>` : ``}

            <div class="${"datum"}"><header><h5>Status:</h5></header>
              <main>${escape2(tx.attributes.status)}
              </main></div>


            <div class="${"datum"}"><header><h5>Created:</h5></header>
              <main>${escape2(format2.date(tx.attributes.createdAt))}, ${escape2(format2.time(tx.attributes.createdAt))}
              </main></div>

            <div class="${"datum"}"><header><h5>Settled:</h5></header>
              <main>${tx.attributes.settledAt ? `${escape2(format2.date(tx.attributes.settledAt))}, ${escape2(format2.time(tx.attributes.settledAt))}` : `<em>Awaiting settlement</em>`}</main>
            </div></aside>
        <aside class="${"tags"}">${validate_component(Tags, "Tags").$$render($$result, { selected: tx.relationships.tags.data }, {}, {})}
        </aside></div>
    </td></tr>` : ``}`)}
    ${account.attributes.accountType === "TRANSACTIONAL" ? `<tr class="${"tx summary"}"><td${add_attribute("colspan", columns.length - 1, 0)}>Total spent <i class="${"fas fa-info-circle"}" data-tooltip="${"right"}" aria-label="${"Does not include any incoming funds or transfers between your own accounts/savers"}"></i></td>
      <td data-col="${"amount"}"><div>${escape2(format2.currency(total(d2.tx)))}</div></td>
    </tr>` : ``}` : ``}
  </tbody>`)}</table>` : `<div class="${"loading"}">Loading...</div>`}


${validate_component(Debug, "Debug").$$render($$result, { content: txs }, {}, {})}`;
});
var css$2 = {
  code: ".info.svelte-lt6exp.svelte-lt6exp.svelte-lt6exp{width:calc(var(--gap) * 20);position:fixed;top:74px;padding:var(--gap);height:calc(100vh - var(--header-height) - var(--gap) - var(--gap) );overflow:auto}main.svelte-lt6exp.svelte-lt6exp.svelte-lt6exp{margin-left:calc(var(--gap) * 20);padding-left:var(--gap)}h2.svelte-lt6exp.svelte-lt6exp.svelte-lt6exp{line-height:1.2}.datum.svelte-lt6exp h3.svelte-lt6exp.svelte-lt6exp{color:rgb(var(--c-white));font-family:var(--mono-font)}.info.svelte-lt6exp>.svelte-lt6exp+.svelte-lt6exp{margin-top:calc(var(--gap) * 2)}.datum.svelte-lt6exp.svelte-lt6exp.svelte-lt6exp{position:relative}.refresh.svelte-lt6exp.svelte-lt6exp.svelte-lt6exp{position:absolute;right:0;bottom:0;background:none;border:none;color:rgba(var(--c-white), .25);display:block;width:32px;height:32px}.refresh[data-working=true].svelte-lt6exp i.svelte-lt6exp.svelte-lt6exp{animation:svelte-lt6exp-spin 1s infinite ease-in-out}.refresh.svelte-lt6exp.svelte-lt6exp.svelte-lt6exp:hover{color:rgba(var(--c-white), 1)}[data-load-sentinel].svelte-lt6exp.svelte-lt6exp.svelte-lt6exp{display:flex;flex-flow:row nowrap;justify-content:center;opacity:.25}[data-load-sentinel].svelte-lt6exp h3.svelte-lt6exp.svelte-lt6exp{padding:calc(var(--gap) * 4);font-weight:300;text-transform:uppercase}[data-load-sentinel].svelte-lt6exp i.svelte-lt6exp.svelte-lt6exp{margin-right:calc(var(--gap) * .5);animation:svelte-lt6exp-spin 1s infinite linear;width:1em;height:1em}@keyframes svelte-lt6exp-spin{from{transform:none}to{transform:rotate(360deg)}}",
  map: `{"version":3,"file":"[id].svelte","sources":["[id].svelte"],"sourcesContent":["<script>\\n\\n  import { onMount } from 'svelte';\\n  import { page } from '$app/stores';\\n  import { api } from '$lib/api.js';\\n  import { accounts, txcache } from '$lib/store.js';\\n  import { format, log } from '$lib/helpers';\\n\\n  import Filter from '$lib/Filter.svelte';\\n  import Transactions from '$lib/Transactions.svelte';\\n\\n  let account, store;\\n\\n  let loading = false;\\n\\n  let filters;\\n  let filter_chooser;\\n  let filter_store;\\n\\n  let working = false;\\n\\n\\n  // Load when we navigate to a new account page\\n  $: load_account( $page.params.id );\\n  const load_account = async id => {\\n\\n    filter_chooser && filter_chooser.clear_filters( false );\\n\\n    filter_store = {\\n      next_page: '',\\n      data: {}\\n    };\\n\\n    account = $accounts[$accounts.findIndex( a => id === a.id )];\\n    if( account ) {\\n      if( !$txcache.hasOwnProperty( id ) ) {\\n        $txcache[id] = {\\n          next_page: '',\\n          data: {},\\n        };\\n      }\\n\\n      if( !Object.keys($txcache[id].data).length ) {\\n        get_txn();\\n      } else {\\n        store = $txcache[id];\\n      }\\n    }\\n\\n  };\\n\\n  const refresh = () => {\\n    working = true;\\n    delete $txcache[account.id];\\n    Promise.all( [\\n      api.get( 'accounts' ).then( result => $accounts = result.data ),\\n      get_txn()\\n    ]).then( () => {\\n      working = false;\\n    } );\\n  };\\n\\n\\n  const apply_filters = () => {\\n    // If this is being called, the filters have changed so we need to get a new store\\n    filter_store = {\\n      next_page: '',\\n      data: {}\\n    };\\n\\n    get_txn();\\n  }\\n\\n  const get_txn = async () => {\\n\\n    // Quick test to see if any of the filters have values\\n    const use_filters = filters && Object.values( filters ).some( a => a );\\n\\n    // Store the response data in different stores depending on if it's filtered data or not\\n    if( use_filters ) {\\n      log( 'Using filter store' );\\n      store = filter_store;\\n    } else {\\n      log( 'Using normal txcache store' );\\n      store = $txcache[account.id];\\n    }\\n\\n    // Begin the loading spinners\\n    loading = true;\\n\\n    // Next, we're using different API calls if it's a first call or loading the next page.\\n    // If it's the next page of a filter call, the next_page url will already include the filter data so we don't need to include it in the API call\\n    let results;\\n    if ( store.next_page ) {\\n      results = await api.get_custom( store.next_page ).catch( err => log( err ) );\\n    } else {\\n      results = await api.get_txns_for_acct( account.id, filters ).catch( err => log( err ) );\\n    }\\n    loading = false;\\n\\n    results.data.forEach( tx => {\\n      if( !store.data.hasOwnProperty( tx.id ) ) {\\n        store.data[tx.id] = tx;\\n      }\\n    } );\\n\\n    store.next_page = results.links.next;\\n\\n  };\\n\\n  const observer = new IntersectionObserver( entries => entries.forEach( e => e.isIntersecting && store.next_page && get_txn() ), { rootMargin: '0px 0px 100%' });\\n\\n  onMount( () => {\\n    let target = document.querySelector( '[data-load-sentinel]' );\\n    observer.observe( target );\\n  } );\\n\\n\\n<\/script>\\n\\n<style>\\n\\n  .info {\\n    width: calc(var(--gap) * 20);\\n    position: fixed;\\n    top: 74px;\\n    padding: var(--gap);\\n    height: calc(100vh - var(--header-height) - var(--gap) - var(--gap) );\\n    overflow: auto;\\n\\n  }\\n  main {\\n    margin-left: calc(var(--gap) * 20);\\n    padding-left: var(--gap);\\n  }\\n\\n  h2 {\\n    line-height: 1.2;\\n  }\\n\\n  .datum h3 {\\n    color: rgb(var(--c-white));\\n    font-family: var(--mono-font);\\n  }\\n\\n  .info > * + * {\\n    margin-top: calc(var(--gap) * 2);\\n  }\\n\\n  .datum {\\n    position: relative;\\n  }\\n  .refresh {\\n    position: absolute;\\n    right: 0;\\n    bottom: 0;\\n    background: none;\\n    border: none;\\n    color: rgba(var(--c-white), .25);\\n    display: block;\\n    width: 32px;\\n    height: 32px;\\n  }\\n  .refresh[data-working=true] i {\\n    animation: spin 1s infinite ease-in-out;\\n  }\\n  .refresh:hover {\\n    color: rgba(var(--c-white), 1);\\n  }\\n\\n  [data-load-sentinel] {\\n    display: flex;\\n    flex-flow: row nowrap;\\n    justify-content: center;\\n    opacity: .25;\\n  }\\n  [data-load-sentinel] h3 {\\n    padding: calc(var(--gap) * 4);\\n    font-weight: 300;\\n    text-transform: uppercase;\\n  }\\n  [data-load-sentinel] i {\\n    margin-right: calc(var(--gap) * .5);\\n    animation: spin 1s infinite linear;\\n    width: 1em;\\n    height: 1em;\\n  }\\n\\n  @keyframes spin {\\n    from {\\n      transform: none;\\n    }\\n    to {\\n      transform: rotate(360deg);\\n    }\\n  }\\n\\n</style>\\n\\n<svelte:head><title>{account ? account.attributes.displayName : 'Accounts'} &mdash; UPify</title></svelte:head>\\n\\n<aside class=\\"info\\">\\n  <div class=\\"datum\\">\\n    <h5>{account.attributes.accountType} Account:</h5>\\n    <h2>{account.attributes.displayName}</h2>\\n  </div>\\n\\n  <div class=\\"datum\\">\\n    <h5>Current balance:</h5>\\n    <h3>\${format.currency( account.attributes.balance.value )}</h3>\\n    <button type=\\"button\\" class=\\"refresh\\" on:click={refresh} data-working={working}><i class=\\"fas fa-sync-alt\\"></i></button>\\n  </div>\\n\\n  <div class=\\"filters\\">\\n    <Filter bind:filters bind:this={filter_chooser} on:applied_filters={apply_filters} />\\n  </div>\\n</aside>\\n\\n<main>\\n  <Transactions bind:txs={store.data} bind:account={account} />\\n  <div data-load-sentinel>{#if loading}\\n    <h3><i class=\\"fas fa-sync-alt\\"></i>Loading&hellip;</h3>\\n  {/if}</div>\\n</main>\\n\\n<!-- <Debug content={store} /> -->\\n"],"names":[],"mappings":"AA0HE,KAAK,0CAAC,CAAC,AACL,KAAK,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAC5B,QAAQ,CAAE,KAAK,CACf,GAAG,CAAE,IAAI,CACT,OAAO,CAAE,IAAI,KAAK,CAAC,CACnB,MAAM,CAAE,KAAK,KAAK,CAAC,CAAC,CAAC,IAAI,eAAe,CAAC,CAAC,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,IAAI,KAAK,CAAC,EAAE,CACrE,QAAQ,CAAE,IAAI,AAEhB,CAAC,AACD,IAAI,0CAAC,CAAC,AACJ,WAAW,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CAClC,YAAY,CAAE,IAAI,KAAK,CAAC,AAC1B,CAAC,AAED,EAAE,0CAAC,CAAC,AACF,WAAW,CAAE,GAAG,AAClB,CAAC,AAED,oBAAM,CAAC,EAAE,4BAAC,CAAC,AACT,KAAK,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC1B,WAAW,CAAE,IAAI,WAAW,CAAC,AAC/B,CAAC,AAED,mBAAK,CAAG,cAAC,CAAG,cAAE,CAAC,AACb,UAAU,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,AAClC,CAAC,AAED,MAAM,0CAAC,CAAC,AACN,QAAQ,CAAE,QAAQ,AACpB,CAAC,AACD,QAAQ,0CAAC,CAAC,AACR,QAAQ,CAAE,QAAQ,CAClB,KAAK,CAAE,CAAC,CACR,MAAM,CAAE,CAAC,CACT,UAAU,CAAE,IAAI,CAChB,MAAM,CAAE,IAAI,CACZ,KAAK,CAAE,KAAK,IAAI,SAAS,CAAC,CAAC,CAAC,GAAG,CAAC,CAChC,OAAO,CAAE,KAAK,CACd,KAAK,CAAE,IAAI,CACX,MAAM,CAAE,IAAI,AACd,CAAC,AACD,QAAQ,CAAC,YAAY,CAAC,IAAI,eAAC,CAAC,CAAC,4BAAC,CAAC,AAC7B,SAAS,CAAE,kBAAI,CAAC,EAAE,CAAC,QAAQ,CAAC,WAAW,AACzC,CAAC,AACD,kDAAQ,MAAM,AAAC,CAAC,AACd,KAAK,CAAE,KAAK,IAAI,SAAS,CAAC,CAAC,CAAC,CAAC,CAAC,AAChC,CAAC,AAED,CAAC,kBAAkB,CAAC,0CAAC,CAAC,AACpB,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CACrB,eAAe,CAAE,MAAM,CACvB,OAAO,CAAE,GAAG,AACd,CAAC,AACD,CAAC,kBAAkB,eAAC,CAAC,EAAE,4BAAC,CAAC,AACvB,OAAO,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,CAC7B,WAAW,CAAE,GAAG,CAChB,cAAc,CAAE,SAAS,AAC3B,CAAC,AACD,CAAC,kBAAkB,eAAC,CAAC,CAAC,4BAAC,CAAC,AACtB,YAAY,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,CACnC,SAAS,CAAE,kBAAI,CAAC,EAAE,CAAC,QAAQ,CAAC,MAAM,CAClC,KAAK,CAAE,GAAG,CACV,MAAM,CAAE,GAAG,AACb,CAAC,AAED,WAAW,kBAAK,CAAC,AACf,IAAI,AAAC,CAAC,AACJ,SAAS,CAAE,IAAI,AACjB,CAAC,AACD,EAAE,AAAC,CAAC,AACF,SAAS,CAAE,OAAO,MAAM,CAAC,AAC3B,CAAC,AACH,CAAC"}`
};
var U5Bidu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $txcache, $$unsubscribe_txcache;
  let $accounts, $$unsubscribe_accounts;
  let $page, $$unsubscribe_page;
  $$unsubscribe_txcache = subscribe(txcache, (value) => $txcache = value);
  $$unsubscribe_accounts = subscribe(accounts, (value) => $accounts = value);
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let account, store;
  let loading = false;
  let filters;
  let filter_chooser;
  let filter_store;
  let working = false;
  const load_account = async (id) => {
    filter_chooser && filter_chooser.clear_filters(false);
    filter_store = { next_page: "", data: {} };
    account = $accounts[$accounts.findIndex((a) => id === a.id)];
    if (account) {
      if (!$txcache.hasOwnProperty(id)) {
        set_store_value(txcache, $txcache[id] = { next_page: "", data: {} }, $txcache);
      }
      if (!Object.keys($txcache[id].data).length) {
        get_txn();
      } else {
        store = $txcache[id];
      }
    }
  };
  const get_txn = async () => {
    const use_filters = filters && Object.values(filters).some((a) => a);
    if (use_filters) {
      log("Using filter store");
      store = filter_store;
    } else {
      log("Using normal txcache store");
      store = $txcache[account.id];
    }
    loading = true;
    let results;
    if (store.next_page) {
      results = await api.get_custom(store.next_page).catch((err) => log(err));
    } else {
      results = await api.get_txns_for_acct(account.id, filters).catch((err) => log(err));
    }
    loading = false;
    results.data.forEach((tx) => {
      if (!store.data.hasOwnProperty(tx.id)) {
        store.data[tx.id] = tx;
      }
    });
    store.next_page = results.links.next;
  };
  new IntersectionObserver((entries) => entries.forEach((e) => e.isIntersecting && store.next_page && get_txn()), { rootMargin: "0px 0px 100%" });
  $$result.css.add(css$2);
  let $$settled;
  let $$rendered;
  do {
    $$settled = true;
    {
      load_account($page.params.id);
    }
    $$rendered = `${$$result.head += `${$$result.title = `<title>${escape2(account ? account.attributes.displayName : "Accounts")} \u2014 UPify</title>`, ""}`, ""}

<aside class="${"info svelte-lt6exp"}"><div class="${"datum svelte-lt6exp"}"><h5>${escape2(account.attributes.accountType)} Account:</h5>
    <h2 class="${"svelte-lt6exp"}">${escape2(account.attributes.displayName)}</h2></div>

  <div class="${"datum svelte-lt6exp"}"><h5>Current balance:</h5>
    <h3 class="${"svelte-lt6exp"}">$${escape2(format2.currency(account.attributes.balance.value))}</h3>
    <button type="${"button"}" class="${"refresh svelte-lt6exp"}"${add_attribute("data-working", working, 0)}><i class="${"fas fa-sync-alt svelte-lt6exp"}"></i></button></div>

  <div class="${"filters svelte-lt6exp"}">${validate_component(Filter, "Filter").$$render($$result, { filters, this: filter_chooser }, {
      filters: ($$value) => {
        filters = $$value;
        $$settled = false;
      },
      this: ($$value) => {
        filter_chooser = $$value;
        $$settled = false;
      }
    }, {})}</div></aside>

<main class="${"svelte-lt6exp"}">${validate_component(Transactions, "Transactions").$$render($$result, { txs: store.data, account }, {
      txs: ($$value) => {
        store.data = $$value;
        $$settled = false;
      },
      account: ($$value) => {
        account = $$value;
        $$settled = false;
      }
    }, {})}
  <div data-load-sentinel class="${"svelte-lt6exp"}">${loading ? `
    <h3 class="${"svelte-lt6exp"}"><i class="${"fas fa-sync-alt svelte-lt6exp"}"></i>Loading\u2026</h3>
  ` : ``}</div></main>

`;
  } while (!$$settled);
  $$unsubscribe_txcache();
  $$unsubscribe_accounts();
  $$unsubscribe_page();
  return $$rendered;
});
var _id_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": U5Bidu5D
});
var css$1 = {
  code: "form.svelte-jhe1z9.svelte-jhe1z9{width:100%;padding:var(--gap);border:1px solid rgb(var(--c-border));background:rgb(var(--c-background))}form.svelte-jhe1z9 div.svelte-jhe1z9{display:flex;flex-flow:row nowrap;font-size:var(--font-base);width:100%}h5.svelte-jhe1z9.svelte-jhe1z9:not(:first-child){margin-top:calc(var(--gap)*2)}.input-prefix.svelte-jhe1z9.svelte-jhe1z9{flex:0 0 auto;padding:8px;background:rgba(var(--c-background-darker));border:1px solid rgb(var(--c-border));border-radius:var(--gbr) 0 0 var(--gbr);border-right-width:0;font-family:var(--mono-font)}input.svelte-jhe1z9.svelte-jhe1z9{border-radius:var(--gbr);border:1px solid rgb(var(--c-border));background:rgb(var(--c-black));padding:8px;margin:0;flex:1;color:rgb(var(--c-white));font-family:var(--mono-font)}.button.svelte-jhe1z9.svelte-jhe1z9{background:rgb(var(--c-accent-blue));color:rgb(var(--text))}input.svelte-jhe1z9.svelte-jhe1z9:focus{outline:none;border-color:rgb(var(--c-accent-blue))}.input-prefix.svelte-jhe1z9+input.svelte-jhe1z9{border-top-left-radius:0;border-bottom-left-radius:0}table.svelte-jhe1z9.svelte-jhe1z9{border-collapse:collapse;border:1px solid rgb(var(--c-border))}td.svelte-jhe1z9.svelte-jhe1z9,th.svelte-jhe1z9.svelte-jhe1z9{border:1px solid rgb(var(--c-border))}th.svelte-jhe1z9.svelte-jhe1z9{text-align:left;font-size:var(--font-small);text-transform:uppercase}td.svelte-jhe1z9.svelte-jhe1z9{padding:calc(var(--gap) * .5)}td.svelte-jhe1z9.svelte-jhe1z9:last-child{width:1%}",
  map: `{"version":3,"file":"Custom.svelte","sources":["Custom.svelte"],"sourcesContent":["<script>\\n\\n  import { api } from '$lib/api';\\n  import Debug from '$lib/Debug.svelte';\\n\\n  const base = 'https://api.up.com.au/api/v1/';\\n\\n  let path;\\n  let params = [];\\n\\n  let results;\\n\\n  const run_query = async () => {\\n    results = null;\\n    console.log( 'Running query' );\\n    let submit_params = {};\\n    params.forEach( p => submit_params[p.key] = p.val );\\n    results = await api.get_custom( \`\${base}\${path || 'transactions'}\`, submit_params );\\n  };\\n\\n  const add_param = () => params = [...params, { key: '', val: ''}];\\n  const remove_param = index => params = params.filter( (p, i) => i !== index );\\n<\/script>\\n\\n<style>\\n  form {\\n    width: 100%;\\n    padding: var(--gap);\\n    border: 1px solid rgb(var(--c-border));\\n    background: rgb(var(--c-background));\\n  }\\n  form div {\\n    display: flex;\\n    flex-flow: row nowrap;\\n    font-size: var(--font-base);\\n    width: 100%;\\n  }\\n  h5:not(:first-child) {\\n    margin-top: calc(var(--gap)*2);\\n  }\\n  .input-prefix {\\n    flex: 0 0 auto;\\n    padding: 8px;\\n    background: rgba(var(--c-background-darker));\\n    border: 1px solid rgb(var(--c-border));\\n    border-radius: var(--gbr) 0 0 var(--gbr);\\n    border-right-width: 0;\\n    font-family: var(--mono-font);\\n  }\\n  input {\\n    border-radius: var(--gbr);\\n    border: 1px solid rgb(var(--c-border));\\n    background: rgb(var(--c-black));\\n    padding: 8px;\\n    margin: 0;\\n    flex: 1;\\n    color: rgb(var(--c-white));\\n    font-family: var(--mono-font);\\n  }\\n  .button {\\n    background: rgb(var(--c-accent-blue));\\n    color: rgb(var(--text));\\n    /* font-family: var(--ui-font);\\n    text-transform: uppercase;\\n    font-size: var(--font-small);\\n    font-weight: bold;\\n    width: auto;\\n    flex: 0 0 auto; */\\n  }\\n  input:focus {\\n    outline: none;\\n    border-color: rgb(var(--c-accent-blue));\\n  }\\n  .input-prefix + input {\\n    border-top-left-radius: 0;\\n    border-bottom-left-radius: 0;\\n  }\\n\\n  table {\\n    border-collapse: collapse;\\n    border: 1px solid rgb(var(--c-border));\\n  }\\n  td, th {\\n    border: 1px solid rgb(var(--c-border));\\n  }\\n  th {\\n    text-align: left;\\n    font-size: var(--font-small);\\n    text-transform: uppercase;\\n  }\\n  td {\\n    padding: calc(var(--gap) * .5);\\n  }\\n  td:last-child {\\n    width: 1%;\\n  }\\n</style>\\n\\n<header>\\n  <h5>Debug</h5>\\n  <h2>Custom</h2>\\n</header>\\n\\n<main>\\n  <form on:submit|preventDefault={run_query}>\\n\\n    <h5>Path:</h5>\\n    <div>\\n      <label for=\\"path\\" class=\\"input-prefix\\">{base}</label>\\n      <input id=\\"path\\" bind:value={path} placeholder=\\"transactions\\">\\n    </div>\\n\\n    <h5>Paramaters:</h5>\\n    <div>\\n      <table>\\n        {#if params.length}<thead>\\n          <tr>\\n            <th scope=\\"col\\">Key</th>\\n            <th scope=\\"col\\">Value</th>\\n            <th></th>\\n          </tr>\\n        </thead>\\n        <tbody>{#each params as p, i}\\n          <tr>\\n            <td><input type=\\"text\\" bind:value={p.key}></td>\\n            <td><input type=\\"text\\" bind:value={p.val}></td>\\n            <td><button type=\\"button\\" class=\\"button small\\" on:click={() => remove_param(i)}>Remove</button></td>\\n          </tr>\\n        {/each}</tbody>{/if}\\n        <tfoot>\\n          <tr>\\n            <td colspan=\\"3\\"><button type=\\"button\\" class=\\"button small\\" on:click={add_param}>Add</button></td>\\n          </tr>\\n        </tfoot>\\n      </table>\\n    </div>\\n    <h5>All done?</h5>\\n    <div>\\n      <button type=\\"submit\\" class=\\"button\\">Run query</button>\\n    </div>\\n  </form>\\n\\n  {#if results}\\n    <h5>Results</h5>\\n    <Debug content={results} sticky=\\"false\\" />\\n  {/if}\\n</main>\\n"],"names":[],"mappings":"AAyBE,IAAI,4BAAC,CAAC,AACJ,KAAK,CAAE,IAAI,CACX,OAAO,CAAE,IAAI,KAAK,CAAC,CACnB,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,IAAI,UAAU,CAAC,CAAC,CACtC,UAAU,CAAE,IAAI,IAAI,cAAc,CAAC,CAAC,AACtC,CAAC,AACD,kBAAI,CAAC,GAAG,cAAC,CAAC,AACR,OAAO,CAAE,IAAI,CACb,SAAS,CAAE,GAAG,CAAC,MAAM,CACrB,SAAS,CAAE,IAAI,WAAW,CAAC,CAC3B,KAAK,CAAE,IAAI,AACb,CAAC,AACD,8BAAE,KAAK,YAAY,CAAC,AAAC,CAAC,AACpB,UAAU,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,AAChC,CAAC,AACD,aAAa,4BAAC,CAAC,AACb,IAAI,CAAE,CAAC,CAAC,CAAC,CAAC,IAAI,CACd,OAAO,CAAE,GAAG,CACZ,UAAU,CAAE,KAAK,IAAI,qBAAqB,CAAC,CAAC,CAC5C,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,IAAI,UAAU,CAAC,CAAC,CACtC,aAAa,CAAE,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,CAAC,CAAC,IAAI,KAAK,CAAC,CACxC,kBAAkB,CAAE,CAAC,CACrB,WAAW,CAAE,IAAI,WAAW,CAAC,AAC/B,CAAC,AACD,KAAK,4BAAC,CAAC,AACL,aAAa,CAAE,IAAI,KAAK,CAAC,CACzB,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,IAAI,UAAU,CAAC,CAAC,CACtC,UAAU,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC/B,OAAO,CAAE,GAAG,CACZ,MAAM,CAAE,CAAC,CACT,IAAI,CAAE,CAAC,CACP,KAAK,CAAE,IAAI,IAAI,SAAS,CAAC,CAAC,CAC1B,WAAW,CAAE,IAAI,WAAW,CAAC,AAC/B,CAAC,AACD,OAAO,4BAAC,CAAC,AACP,UAAU,CAAE,IAAI,IAAI,eAAe,CAAC,CAAC,CACrC,KAAK,CAAE,IAAI,IAAI,MAAM,CAAC,CAAC,AAOzB,CAAC,AACD,iCAAK,MAAM,AAAC,CAAC,AACX,OAAO,CAAE,IAAI,CACb,YAAY,CAAE,IAAI,IAAI,eAAe,CAAC,CAAC,AACzC,CAAC,AACD,2BAAa,CAAG,KAAK,cAAC,CAAC,AACrB,sBAAsB,CAAE,CAAC,CACzB,yBAAyB,CAAE,CAAC,AAC9B,CAAC,AAED,KAAK,4BAAC,CAAC,AACL,eAAe,CAAE,QAAQ,CACzB,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,IAAI,UAAU,CAAC,CAAC,AACxC,CAAC,AACD,8BAAE,CAAE,EAAE,4BAAC,CAAC,AACN,MAAM,CAAE,GAAG,CAAC,KAAK,CAAC,IAAI,IAAI,UAAU,CAAC,CAAC,AACxC,CAAC,AACD,EAAE,4BAAC,CAAC,AACF,UAAU,CAAE,IAAI,CAChB,SAAS,CAAE,IAAI,YAAY,CAAC,CAC5B,cAAc,CAAE,SAAS,AAC3B,CAAC,AACD,EAAE,4BAAC,CAAC,AACF,OAAO,CAAE,KAAK,IAAI,KAAK,CAAC,CAAC,CAAC,CAAC,EAAE,CAAC,AAChC,CAAC,AACD,8BAAE,WAAW,AAAC,CAAC,AACb,KAAK,CAAE,EAAE,AACX,CAAC"}`
};
var base = "https://api.up.com.au/api/v1/";
var Custom = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let path;
  let params = [];
  $$result.css.add(css$1);
  return `<header><h5 class="${"svelte-jhe1z9"}">Debug</h5>
  <h2>Custom</h2></header>

<main><form class="${"svelte-jhe1z9"}"><h5 class="${"svelte-jhe1z9"}">Path:</h5>
    <div class="${"svelte-jhe1z9"}"><label for="${"path"}" class="${"input-prefix svelte-jhe1z9"}">${escape2(base)}</label>
      <input id="${"path"}" placeholder="${"transactions"}" class="${"svelte-jhe1z9"}"${add_attribute("value", path, 0)}></div>

    <h5 class="${"svelte-jhe1z9"}">Paramaters:</h5>
    <div class="${"svelte-jhe1z9"}"><table class="${"svelte-jhe1z9"}">${params.length ? `<thead><tr><th scope="${"col"}" class="${"svelte-jhe1z9"}">Key</th>
            <th scope="${"col"}" class="${"svelte-jhe1z9"}">Value</th>
            <th class="${"svelte-jhe1z9"}"></th></tr></thead>
        <tbody>${each(params, (p, i) => `
          <tr><td class="${"svelte-jhe1z9"}"><input type="${"text"}" class="${"svelte-jhe1z9"}"${add_attribute("value", p.key, 0)}></td>
            <td class="${"svelte-jhe1z9"}"><input type="${"text"}" class="${"svelte-jhe1z9"}"${add_attribute("value", p.val, 0)}></td>
            <td class="${"svelte-jhe1z9"}"><button type="${"button"}" class="${"button small svelte-jhe1z9"}">Remove</button></td></tr>
        `)}</tbody>` : ``}
        <tfoot><tr><td colspan="${"3"}" class="${"svelte-jhe1z9"}"><button type="${"button"}" class="${"button small svelte-jhe1z9"}">Add</button></td></tr></tfoot></table></div>
    <h5 class="${"svelte-jhe1z9"}">All done?</h5>
    <div class="${"svelte-jhe1z9"}"><button type="${"submit"}" class="${"button svelte-jhe1z9"}">Run query</button></div></form>

  ${``}</main>`;
});
var Custom$1 = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": Custom
});
var css = {
  code: "header.svelte-2jq5co{position:sticky;top:calc(var(--header-height) + var(--gap));padding:var(--gap) 0;background:rgb(var(--c-background-darker));z-index:1}h2.svelte-2jq5co{margin:0}",
  map: `{"version":3,"file":"[type].svelte","sources":["[type].svelte"],"sourcesContent":["<script>\\n  import { page } from '$app/stores';\\n\\n  import { accounts, categories, tags, txcache } from '$lib/store';\\n\\n  import Debug from '$lib/Debug.svelte';\\n\\n  $: set_type( $page.params.type );\\n\\n  let content = '';\\n\\n  const set_type = () => {\\n    switch( $page.params.type ) {\\n    case 'Accounts':\\n      content = $accounts;\\n      break;\\n    case 'Categories':\\n      content = $categories;\\n      break;\\n    case 'Tags':\\n      content = $tags;\\n      break;\\n    case 'Transactions':\\n      content = $txcache;\\n      break;\\n    }\\n  }\\n\\n<\/script>\\n\\n<style>\\n  header {\\n    position: sticky;\\n    top: calc(var(--header-height) + var(--gap));\\n    padding: var(--gap) 0;\\n    background: rgb(var(--c-background-darker));\\n    z-index: 1;\\n  }\\n  h2 {\\n    margin: 0;\\n  }\\n</style>\\n\\n<svelte:head>\\n  <title>{$page.params.type} debugging -- UPify</title>\\n</svelte:head>\\n\\n<header>\\n  <h5>Debug</h5>\\n  <h2>{$page.params.type}</h2>\\n</header>\\n\\n<main>\\n  <Debug content={content} sticky=\\"false\\" />\\n</main>\\n"],"names":[],"mappings":"AA+BE,MAAM,cAAC,CAAC,AACN,QAAQ,CAAE,MAAM,CAChB,GAAG,CAAE,KAAK,IAAI,eAAe,CAAC,CAAC,CAAC,CAAC,IAAI,KAAK,CAAC,CAAC,CAC5C,OAAO,CAAE,IAAI,KAAK,CAAC,CAAC,CAAC,CACrB,UAAU,CAAE,IAAI,IAAI,qBAAqB,CAAC,CAAC,CAC3C,OAAO,CAAE,CAAC,AACZ,CAAC,AACD,EAAE,cAAC,CAAC,AACF,MAAM,CAAE,CAAC,AACX,CAAC"}`
};
var U5Btypeu5D = create_ssr_component(($$result, $$props, $$bindings, slots) => {
  let $txcache, $$unsubscribe_txcache;
  let $tags, $$unsubscribe_tags;
  let $categories, $$unsubscribe_categories;
  let $accounts, $$unsubscribe_accounts;
  let $page, $$unsubscribe_page;
  $$unsubscribe_txcache = subscribe(txcache, (value) => $txcache = value);
  $$unsubscribe_tags = subscribe(tags, (value) => $tags = value);
  $$unsubscribe_categories = subscribe(categories$1, (value) => $categories = value);
  $$unsubscribe_accounts = subscribe(accounts, (value) => $accounts = value);
  $$unsubscribe_page = subscribe(page, (value) => $page = value);
  let content = "";
  const set_type = () => {
    switch ($page.params.type) {
      case "Accounts":
        content = $accounts;
        break;
      case "Categories":
        content = $categories;
        break;
      case "Tags":
        content = $tags;
        break;
      case "Transactions":
        content = $txcache;
        break;
    }
  };
  $$result.css.add(css);
  {
    set_type($page.params.type);
  }
  $$unsubscribe_txcache();
  $$unsubscribe_tags();
  $$unsubscribe_categories();
  $$unsubscribe_accounts();
  $$unsubscribe_page();
  return `${$$result.head += `${$$result.title = `<title>${escape2($page.params.type)} debugging -- UPify</title>`, ""}`, ""}

<header class="${"svelte-2jq5co"}"><h5>Debug</h5>
  <h2 class="${"svelte-2jq5co"}">${escape2($page.params.type)}</h2></header>

<main>${validate_component(Debug, "Debug").$$render($$result, { content, sticky: "false" }, {}, {})}</main>`;
});
var _type_ = /* @__PURE__ */ Object.freeze({
  __proto__: null,
  [Symbol.toStringTag]: "Module",
  "default": U5Btypeu5D
});

// .svelte-kit/netlify/entry.js
init();
async function handler(event) {
  const { path, httpMethod, headers, rawQuery, body, isBase64Encoded } = event;
  const query = new URLSearchParams(rawQuery);
  const encoding = isBase64Encoded ? "base64" : headers["content-encoding"] || "utf-8";
  const rawBody = typeof body === "string" ? Buffer.from(body, encoding) : body;
  const rendered = await render({
    method: httpMethod,
    headers,
    path,
    query,
    rawBody
  });
  if (rendered) {
    return {
      isBase64Encoded: false,
      statusCode: rendered.status,
      ...splitHeaders(rendered.headers),
      body: rendered.body
    };
  }
  return {
    statusCode: 404,
    body: "Not found"
  };
}
function splitHeaders(headers) {
  const h = {};
  const m = {};
  for (const key in headers) {
    const value = headers[key];
    const target = Array.isArray(value) ? m : h;
    target[key] = value;
  }
  return {
    headers: h,
    multiValueHeaders: m
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
/*!
 * cookie
 * Copyright(c) 2012-2014 Roman Shtylman
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
/** @preserve
	(c) 2012 by Cédric Mesnil. All rights reserved.

	Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

	    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
	    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
	*/
/** @preserve
 * Counter block mode compatible with  Dr Brian Gladman fileenc.c
 * derived from CryptoJS.mode.CTR
 * Jan Hruby jhruby.web@gmail.com
 */
