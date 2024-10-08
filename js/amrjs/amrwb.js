var Module = typeof Module !== "undefined" ? Module : {};
var AMRWB = (function() {
	var AMRWB = {};
	var Module = {
		canvas: {},
		print: (function(text) {
			console.log(text)
		}),
		onRuntimeInitialized: (function() {
			AMRWB.D_IF_init = Module._D_IF_init;
			AMRWB.D_IF_exit = Module._D_IF_exit;
			AMRWB.D_IF_decode = Module._D_IF_decode;
			AMRWB._free = Module._free;
			AMRWB._HEAPU8 = Module.HEAPU8;
			AMRWB._malloc = Module._malloc;
			return 0
		})
	};
	var moduleOverrides = {};
	var key;
	for (key in Module) {
		if (Module.hasOwnProperty(key)) {
			moduleOverrides[key] = Module[key]
		}
	}
	Module["arguments"] = [];
	Module["thisProgram"] = "./this.program";
	Module["quit"] = (function(status, toThrow) {
		throw toThrow
	});
	Module["preRun"] = [];
	Module["postRun"] = [];
	var ENVIRONMENT_IS_WEB = false;
	var ENVIRONMENT_IS_WORKER = false;
	var ENVIRONMENT_IS_NODE = false;
	var ENVIRONMENT_IS_SHELL = false;
	if (Module["ENVIRONMENT"]) {
		if (Module["ENVIRONMENT"] === "WEB") {
			ENVIRONMENT_IS_WEB = true
		} else if (Module["ENVIRONMENT"] === "WORKER") {
			ENVIRONMENT_IS_WORKER = true
		} else if (Module["ENVIRONMENT"] === "NODE") {
			ENVIRONMENT_IS_NODE = true
		} else if (Module["ENVIRONMENT"] === "SHELL") {
			ENVIRONMENT_IS_SHELL = true
		} else {
			throw new Error("Module['ENVIRONMENT'] value is not valid. must be one of: WEB|WORKER|NODE|SHELL.")
		}
	} else {
		ENVIRONMENT_IS_WEB = typeof window === "object";
		ENVIRONMENT_IS_WORKER = typeof importScripts === "function";
		ENVIRONMENT_IS_NODE = typeof process === "object" && typeof require === "function" && !ENVIRONMENT_IS_WEB && !
			ENVIRONMENT_IS_WORKER;
		ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER
	}
	if (ENVIRONMENT_IS_NODE) {
		var nodeFS;
		var nodePath;
		Module["read"] = function shell_read(filename, binary) {
			var ret;
			ret = tryParseAsDataURI(filename);
			if (!ret) {
				if (!nodeFS) nodeFS = require("fs");
				if (!nodePath) nodePath = require("path");
				filename = nodePath["normalize"](filename);
				ret = nodeFS["readFileSync"](filename)
			}
			return binary ? ret : ret.toString()
		};
		Module["readBinary"] = function readBinary(filename) {
			var ret = Module["read"](filename, true);
			if (!ret.buffer) {
				ret = new Uint8Array(ret)
			}
			assert(ret.buffer);
			return ret
		};
		if (process["argv"].length > 1) {
			Module["thisProgram"] = process["argv"][1].replace(/\\/g, "/")
		}
		Module["arguments"] = process["argv"].slice(2);
		if (typeof module !== "undefined") {
			module["exports"] = Module
		}
		process["on"]("uncaughtException", (function(ex) {
			if (!(ex instanceof ExitStatus)) {
				throw ex
			}
		}));
		process["on"]("unhandledRejection", (function(reason, p) {
			Module["printErr"]("node.js exiting due to unhandled promise rejection");
			process["exit"](1)
		}));
		Module["inspect"] = (function() {
			return "[Emscripten Module object]"
		})
	} else if (ENVIRONMENT_IS_SHELL) {
		if (typeof read != "undefined") {
			Module["read"] = function shell_read(f) {
				var data = tryParseAsDataURI(f);
				if (data) {
					return intArrayToString(data)
				}
				return read(f)
			}
		}
		Module["readBinary"] = function readBinary(f) {
			var data;
			data = tryParseAsDataURI(f);
			if (data) {
				return data
			}
			if (typeof readbuffer === "function") {
				return new Uint8Array(readbuffer(f))
			}
			data = read(f, "binary");
			assert(typeof data === "object");
			return data
		};
		if (typeof scriptArgs != "undefined") {
			Module["arguments"] = scriptArgs
		} else if (typeof arguments != "undefined") {
			Module["arguments"] = arguments
		}
		if (typeof quit === "function") {
			Module["quit"] = (function(status, toThrow) {
				quit(status)
			})
		}
	} else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
		Module["read"] = function shell_read(url) {
			try {
				var xhr = new XMLHttpRequest;
				xhr.open("GET", url, false);
				xhr.send(null);
				return xhr.responseText
			} catch (err) {
				var data = tryParseAsDataURI(url);
				if (data) {
					return intArrayToString(data)
				}
				throw err
			}
		};
		if (ENVIRONMENT_IS_WORKER) {
			Module["readBinary"] = function readBinary(url) {
				try {
					var xhr = new XMLHttpRequest;
					xhr.open("GET", url, false);
					xhr.responseType = "arraybuffer";
					xhr.send(null);
					return new Uint8Array(xhr.response)
				} catch (err) {
					var data = tryParseAsDataURI(url);
					if (data) {
						return data
					}
					throw err
				}
			}
		}
		Module["readAsync"] = function readAsync(url, onload, onerror) {
			var xhr = new XMLHttpRequest;
			xhr.open("GET", url, true);
			xhr.responseType = "arraybuffer";
			xhr.onload = function xhr_onload() {
				if (xhr.status == 200 || xhr.status == 0 && xhr.response) {
					onload(xhr.response);
					return
				}
				var data = tryParseAsDataURI(url);
				if (data) {
					onload(data.buffer);
					return
				}
				onerror()
			};
			xhr.onerror = onerror;
			xhr.send(null)
		};
		if (typeof arguments != "undefined") {
			Module["arguments"] = arguments
		}
		Module["setWindowTitle"] = (function(title) {
			document.title = title
		})
	} else {
		throw new Error("unknown runtime environment")
	}
	Module["print"] = typeof console !== "undefined" ? console.log.bind(console) : typeof print !== "undefined" ?
		print : null;
	Module["printErr"] = typeof printErr !== "undefined" ? printErr : typeof console !== "undefined" && console.warn
		.bind(console) || Module["print"];
	Module.print = Module["print"];
	Module.printErr = Module["printErr"];
	for (key in moduleOverrides) {
		if (moduleOverrides.hasOwnProperty(key)) {
			Module[key] = moduleOverrides[key]
		}
	}
	moduleOverrides = undefined;
	var STACK_ALIGN = 16;
	stackSave = stackRestore = stackAlloc = setTempRet0 = getTempRet0 = (function() {
		abort("cannot use the stack before compiled code is ready to run, and has provided stack access")
	});

	function staticAlloc(size) {
		assert(!staticSealed);
		var ret = STATICTOP;
		STATICTOP = STATICTOP + size + 15 & -16;
		return ret
	}

	function dynamicAlloc(size) {
		assert(DYNAMICTOP_PTR);
		var ret = HEAP32[DYNAMICTOP_PTR >> 2];
		var end = ret + size + 15 & -16;
		HEAP32[DYNAMICTOP_PTR >> 2] = end;
		if (end >= TOTAL_MEMORY) {
			var success = enlargeMemory();
			if (!success) {
				HEAP32[DYNAMICTOP_PTR >> 2] = ret;
				return 0
			}
		}
		return ret
	}

	function alignMemory(size, factor) {
		if (!factor) factor = STACK_ALIGN;
		var ret = size = Math.ceil(size / factor) * factor;
		return ret
	}

	function getNativeTypeSize(type) {
		switch (type) {
			case "i1":
			case "i8":
				return 1;
			case "i16":
				return 2;
			case "i32":
				return 4;
			case "i64":
				return 8;
			case "float":
				return 4;
			case "double":
				return 8;
			default: {
				if (type[type.length - 1] === "*") {
					return 4
				} else if (type[0] === "i") {
					var bits = parseInt(type.substr(1));
					assert(bits % 8 === 0);
					return bits / 8
				} else {
					return 0
				}
			}
		}
	}

	function warnOnce(text) {
		if (!warnOnce.shown) warnOnce.shown = {};
		if (!warnOnce.shown[text]) {
			warnOnce.shown[text] = 1;
			Module.printErr(text)
		}
	}
	var jsCallStartIndex = 1;
	var functionPointers = new Array(0);
	var funcWrappers = {};

	function dynCall(sig, ptr, args) {
		if (args && args.length) {
			assert(args.length == sig.length - 1);
			assert("dynCall_" + sig in Module, "bad function pointer type - no table for sig '" + sig + "'");
			return Module["dynCall_" + sig].apply(null, [ptr].concat(args))
		} else {
			assert(sig.length == 1);
			assert("dynCall_" + sig in Module, "bad function pointer type - no table for sig '" + sig + "'");
			return Module["dynCall_" + sig].call(null, ptr)
		}
	}
	var GLOBAL_BASE = 8;
	var ABORT = 0;
	var EXITSTATUS = 0;

	function assert(condition, text) {
		if (!condition) {
			abort("Assertion failed: " + text)
		}
	}

	function getCFunc(ident) {
		var func = Module["_" + ident];
		assert(func, "Cannot call unknown function " + ident + ", make sure it is exported");
		return func
	}
	var JSfuncs = {
		"stackSave": (function() {
			stackSave()
		}),
		"stackRestore": (function() {
			stackRestore()
		}),
		"arrayToC": (function(arr) {
			var ret = stackAlloc(arr.length);
			writeArrayToMemory(arr, ret);
			return ret
		}),
		"stringToC": (function(str) {
			var ret = 0;
			if (str !== null && str !== undefined && str !== 0) {
				var len = (str.length << 2) + 1;
				ret = stackAlloc(len);
				stringToUTF8(str, ret, len)
			}
			return ret
		})
	};
	var toC = {
		"string": JSfuncs["stringToC"],
		"array": JSfuncs["arrayToC"]
	};

	function ccall(ident, returnType, argTypes, args, opts) {
		var func = getCFunc(ident);
		var cArgs = [];
		var stack = 0;
		assert(returnType !== "array", 'Return type should not be "array".');
		if (args) {
			for (var i = 0; i < args.length; i++) {
				var converter = toC[argTypes[i]];
				if (converter) {
					if (stack === 0) stack = stackSave();
					cArgs[i] = converter(args[i])
				} else {
					cArgs[i] = args[i]
				}
			}
		}
		var ret = func.apply(null, cArgs);
		if (returnType === "string") ret = Pointer_stringify(ret);
		if (stack !== 0) {
			stackRestore(stack)
		}
		return ret
	}

	function setValue(ptr, value, type, noSafe) {
		type = type || "i8";
		if (type.charAt(type.length - 1) === "*") type = "i32";
		switch (type) {
			case "i1":
				HEAP8[ptr >> 0] = value;
				break;
			case "i8":
				HEAP8[ptr >> 0] = value;
				break;
			case "i16":
				HEAP16[ptr >> 1] = value;
				break;
			case "i32":
				HEAP32[ptr >> 2] = value;
				break;
			case "i64":
				tempI64 = [value >>> 0, (tempDouble = value, +Math_abs(tempDouble) >= +1 ? tempDouble > +0 ? (Math_min(+
						Math_floor(tempDouble / +4294967296), +4294967295) | 0) >>> 0 : ~~+Math_ceil((tempDouble - +(~~
						tempDouble >>> 0)) / +4294967296) >>> 0 : 0)], HEAP32[ptr >> 2] = tempI64[0], HEAP32[ptr + 4 >> 2] =
					tempI64[1];
				break;
			case "float":
				HEAPF32[ptr >> 2] = value;
				break;
			case "double":
				HEAPF64[ptr >> 3] = value;
				break;
			default:
				abort("invalid type for setValue: " + type)
		}
	}
	var ALLOC_STATIC = 2;
	var ALLOC_NONE = 4;

	function Pointer_stringify(ptr, length) {
		if (length === 0 || !ptr) return "";
		var hasUtf = 0;
		var t;
		var i = 0;
		while (1) {
			assert(ptr + i < TOTAL_MEMORY);
			t = HEAPU8[ptr + i >> 0];
			hasUtf |= t;
			if (t == 0 && !length) break;
			i++;
			if (length && i == length) break
		}
		if (!length) length = i;
		var ret = "";
		if (hasUtf < 128) {
			var MAX_CHUNK = 1024;
			var curr;
			while (length > 0) {
				curr = String.fromCharCode.apply(String, HEAPU8.subarray(ptr, ptr + Math.min(length, MAX_CHUNK)));
				ret = ret ? ret + curr : curr;
				ptr += MAX_CHUNK;
				length -= MAX_CHUNK
			}
			return ret
		}
		return UTF8ToString(ptr)
	}
	var UTF8Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf8") : undefined;

	function UTF8ArrayToString(u8Array, idx) {
		var endPtr = idx;
		while (u8Array[endPtr]) ++endPtr;
		if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
			return UTF8Decoder.decode(u8Array.subarray(idx, endPtr))
		} else {
			var u0, u1, u2, u3, u4, u5;
			var str = "";
			while (1) {
				u0 = u8Array[idx++];
				if (!u0) return str;
				if (!(u0 & 128)) {
					str += String.fromCharCode(u0);
					continue
				}
				u1 = u8Array[idx++] & 63;
				if ((u0 & 224) == 192) {
					str += String.fromCharCode((u0 & 31) << 6 | u1);
					continue
				}
				u2 = u8Array[idx++] & 63;
				if ((u0 & 240) == 224) {
					u0 = (u0 & 15) << 12 | u1 << 6 | u2
				} else {
					u3 = u8Array[idx++] & 63;
					if ((u0 & 248) == 240) {
						u0 = (u0 & 7) << 18 | u1 << 12 | u2 << 6 | u3
					} else {
						u4 = u8Array[idx++] & 63;
						if ((u0 & 252) == 248) {
							u0 = (u0 & 3) << 24 | u1 << 18 | u2 << 12 | u3 << 6 | u4
						} else {
							u5 = u8Array[idx++] & 63;
							u0 = (u0 & 1) << 30 | u1 << 24 | u2 << 18 | u3 << 12 | u4 << 6 | u5
						}
					}
				}
				if (u0 < 65536) {
					str += String.fromCharCode(u0)
				} else {
					var ch = u0 - 65536;
					str += String.fromCharCode(55296 | ch >> 10, 56320 | ch & 1023)
				}
			}
		}
	}

	function UTF8ToString(ptr) {
		return UTF8ArrayToString(HEAPU8, ptr)
	}

	function stringToUTF8Array(str, outU8Array, outIdx, maxBytesToWrite) {
		if (!(maxBytesToWrite > 0)) return 0;
		var startIdx = outIdx;
		var endIdx = outIdx + maxBytesToWrite - 1;
		for (var i = 0; i < str.length; ++i) {
			var u = str.charCodeAt(i);
			if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
			if (u <= 127) {
				if (outIdx >= endIdx) break;
				outU8Array[outIdx++] = u
			} else if (u <= 2047) {
				if (outIdx + 1 >= endIdx) break;
				outU8Array[outIdx++] = 192 | u >> 6;
				outU8Array[outIdx++] = 128 | u & 63
			} else if (u <= 65535) {
				if (outIdx + 2 >= endIdx) break;
				outU8Array[outIdx++] = 224 | u >> 12;
				outU8Array[outIdx++] = 128 | u >> 6 & 63;
				outU8Array[outIdx++] = 128 | u & 63
			} else if (u <= 2097151) {
				if (outIdx + 3 >= endIdx) break;
				outU8Array[outIdx++] = 240 | u >> 18;
				outU8Array[outIdx++] = 128 | u >> 12 & 63;
				outU8Array[outIdx++] = 128 | u >> 6 & 63;
				outU8Array[outIdx++] = 128 | u & 63
			} else if (u <= 67108863) {
				if (outIdx + 4 >= endIdx) break;
				outU8Array[outIdx++] = 248 | u >> 24;
				outU8Array[outIdx++] = 128 | u >> 18 & 63;
				outU8Array[outIdx++] = 128 | u >> 12 & 63;
				outU8Array[outIdx++] = 128 | u >> 6 & 63;
				outU8Array[outIdx++] = 128 | u & 63
			} else {
				if (outIdx + 5 >= endIdx) break;
				outU8Array[outIdx++] = 252 | u >> 30;
				outU8Array[outIdx++] = 128 | u >> 24 & 63;
				outU8Array[outIdx++] = 128 | u >> 18 & 63;
				outU8Array[outIdx++] = 128 | u >> 12 & 63;
				outU8Array[outIdx++] = 128 | u >> 6 & 63;
				outU8Array[outIdx++] = 128 | u & 63
			}
		}
		outU8Array[outIdx] = 0;
		return outIdx - startIdx
	}

	function stringToUTF8(str, outPtr, maxBytesToWrite) {
		assert(typeof maxBytesToWrite == "number",
			"stringToUTF8(str, outPtr, maxBytesToWrite) is missing the third parameter that specifies the length of the output buffer!"
			);
		return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite)
	}

	function lengthBytesUTF8(str) {
		var len = 0;
		for (var i = 0; i < str.length; ++i) {
			var u = str.charCodeAt(i);
			if (u >= 55296 && u <= 57343) u = 65536 + ((u & 1023) << 10) | str.charCodeAt(++i) & 1023;
			if (u <= 127) {
				++len
			} else if (u <= 2047) {
				len += 2
			} else if (u <= 65535) {
				len += 3
			} else if (u <= 2097151) {
				len += 4
			} else if (u <= 67108863) {
				len += 5
			} else {
				len += 6
			}
		}
		return len
	}
	var UTF16Decoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-16le") : undefined;

	function demangle(func) {
		warnOnce("warning: build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling");
		return func
	}

	function demangleAll(text) {
		var regex = /__Z[\w\d_]+/g;
		return text.replace(regex, (function(x) {
			var y = demangle(x);
			return x === y ? x : x + " [" + y + "]"
		}))
	}

	function jsStackTrace() {
		var err = new Error;
		if (!err.stack) {
			try {
				throw new Error(0)
			} catch (e) {
				err = e
			}
			if (!err.stack) {
				return "(no stack trace available)"
			}
		}
		return err.stack.toString()
	}

	function stackTrace() {
		var js = jsStackTrace();
		if (Module["extraStackTrace"]) js += "\n" + Module["extraStackTrace"]();
		return demangleAll(js)
	}
	var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;

	function updateGlobalBufferViews() {
		Module["HEAP8"] = HEAP8 = new Int8Array(buffer);
		Module["HEAP16"] = HEAP16 = new Int16Array(buffer);
		Module["HEAP32"] = HEAP32 = new Int32Array(buffer);
		Module["HEAPU8"] = HEAPU8 = new Uint8Array(buffer);
		Module["HEAPU16"] = HEAPU16 = new Uint16Array(buffer);
		Module["HEAPU32"] = HEAPU32 = new Uint32Array(buffer);
		Module["HEAPF32"] = HEAPF32 = new Float32Array(buffer);
		Module["HEAPF64"] = HEAPF64 = new Float64Array(buffer)
	}
	var STATIC_BASE, STATICTOP, staticSealed;
	var STACK_BASE, STACKTOP, STACK_MAX;
	var DYNAMIC_BASE, DYNAMICTOP_PTR;
	STATIC_BASE = STATICTOP = STACK_BASE = STACKTOP = STACK_MAX = DYNAMIC_BASE = DYNAMICTOP_PTR = 0;
	staticSealed = false;

	function writeStackCookie() {
		assert((STACK_MAX & 3) == 0);
		HEAPU32[(STACK_MAX >> 2) - 1] = 34821223;
		HEAPU32[(STACK_MAX >> 2) - 2] = 2310721022
	}

	function checkStackCookie() {
		if (HEAPU32[(STACK_MAX >> 2) - 1] != 34821223 || HEAPU32[(STACK_MAX >> 2) - 2] != 2310721022) {
			abort(
				"Stack overflow! Stack cookie has been overwritten, expected hex dwords 0x89BACDFE and 0x02135467, but received 0x" +
				HEAPU32[(STACK_MAX >> 2) - 2].toString(16) + " " + HEAPU32[(STACK_MAX >> 2) - 1].toString(16))
		}
		if (HEAP32[0] !== 1668509029)
		throw "Runtime error: The application has corrupted its heap memory area (address zero)!"
	}

	function abortStackOverflow(allocSize) {
		abort("Stack overflow! Attempted to allocate " + allocSize + " bytes on the stack, but stack has only " + (
			STACK_MAX - stackSave() + allocSize) + " bytes available!")
	}

	function abortOnCannotGrowMemory() {
		abort(
			"Cannot enlarge memory arrays. Either (1) compile with  -s TOTAL_MEMORY=X  with X higher than the current value " +
			TOTAL_MEMORY +
			", (2) compile with  -s ALLOW_MEMORY_GROWTH=1  which allows increasing the size at runtime but prevents some optimizations, (3) set Module.TOTAL_MEMORY to a higher value before the program runs, or (4) if you want malloc to return NULL (0) instead of this abort, compile with  -s ABORTING_MALLOC=0 "
			)
	}

	function enlargeMemory() {
		abortOnCannotGrowMemory()
	}
	var TOTAL_STACK = Module["TOTAL_STACK"] || 65536;
	var TOTAL_MEMORY = Module["TOTAL_MEMORY"] || 16777216;
	if (TOTAL_MEMORY < TOTAL_STACK) Module.printErr("TOTAL_MEMORY should be larger than TOTAL_STACK, was " +
		TOTAL_MEMORY + "! (TOTAL_STACK=" + TOTAL_STACK + ")");
	assert(typeof Int32Array !== "undefined" && typeof Float64Array !== "undefined" && Int32Array.prototype
		.subarray !== undefined && Int32Array.prototype.set !== undefined,
		"JS engine does not provide full typed array support");
	if (Module["buffer"]) {
		buffer = Module["buffer"];
		assert(buffer.byteLength === TOTAL_MEMORY, "provided buffer should be " + TOTAL_MEMORY + " bytes, but it is " +
			buffer.byteLength)
	} else {
		{
			buffer = new ArrayBuffer(TOTAL_MEMORY)
		}
		assert(buffer.byteLength === TOTAL_MEMORY);
		Module["buffer"] = buffer
	}
	updateGlobalBufferViews();

	function getTotalMemory() {
		return TOTAL_MEMORY
	}
	HEAP32[0] = 1668509029;
	HEAP16[1] = 25459;
	if (HEAPU8[2] !== 115 || HEAPU8[3] !== 99) throw "Runtime error: expected the system to be little-endian!";

	function callRuntimeCallbacks(callbacks) {
		while (callbacks.length > 0) {
			var callback = callbacks.shift();
			if (typeof callback == "function") {
				callback();
				continue
			}
			var func = callback.func;
			if (typeof func === "number") {
				if (callback.arg === undefined) {
					Module["dynCall_v"](func)
				} else {
					Module["dynCall_vi"](func, callback.arg)
				}
			} else {
				func(callback.arg === undefined ? null : callback.arg)
			}
		}
	}
	var __ATPRERUN__ = [];
	var __ATINIT__ = [];
	var __ATMAIN__ = [];
	var __ATEXIT__ = [];
	var __ATPOSTRUN__ = [];
	var runtimeInitialized = false;
	var runtimeExited = false;

	function preRun() {
		if (Module["preRun"]) {
			if (typeof Module["preRun"] == "function") Module["preRun"] = [Module["preRun"]];
			while (Module["preRun"].length) {
				addOnPreRun(Module["preRun"].shift())
			}
		}
		callRuntimeCallbacks(__ATPRERUN__)
	}

	function ensureInitRuntime() {
		checkStackCookie();
		if (runtimeInitialized) return;
		runtimeInitialized = true;
		callRuntimeCallbacks(__ATINIT__)
	}

	function preMain() {
		checkStackCookie();
		callRuntimeCallbacks(__ATMAIN__)
	}

	function exitRuntime() {
		checkStackCookie();
		callRuntimeCallbacks(__ATEXIT__);
		runtimeExited = true
	}

	function postRun() {
		checkStackCookie();
		if (Module["postRun"]) {
			if (typeof Module["postRun"] == "function") Module["postRun"] = [Module["postRun"]];
			while (Module["postRun"].length) {
				addOnPostRun(Module["postRun"].shift())
			}
		}
		callRuntimeCallbacks(__ATPOSTRUN__)
	}

	function addOnPreRun(cb) {
		__ATPRERUN__.unshift(cb)
	}

	function addOnPostRun(cb) {
		__ATPOSTRUN__.unshift(cb)
	}

	function writeArrayToMemory(array, buffer) {
		assert(array.length >= 0, "writeArrayToMemory array must have a length (should be an array or typed array)");
		HEAP8.set(array, buffer)
	}

	function writeAsciiToMemory(str, buffer, dontAddNull) {
		for (var i = 0; i < str.length; ++i) {
			assert(str.charCodeAt(i) === str.charCodeAt(i) & 255);
			HEAP8[buffer++ >> 0] = str.charCodeAt(i)
		}
		if (!dontAddNull) HEAP8[buffer >> 0] = 0
	}
	assert(Math["imul"] && Math["fround"] && Math["clz32"] && Math["trunc"],
		"this is a legacy browser, build with LEGACY_VM_SUPPORT");
	var Math_abs = Math.abs;
	var Math_cos = Math.cos;
	var Math_sin = Math.sin;
	var Math_tan = Math.tan;
	var Math_acos = Math.acos;
	var Math_asin = Math.asin;
	var Math_atan = Math.atan;
	var Math_atan2 = Math.atan2;
	var Math_exp = Math.exp;
	var Math_log = Math.log;
	var Math_sqrt = Math.sqrt;
	var Math_ceil = Math.ceil;
	var Math_floor = Math.floor;
	var Math_pow = Math.pow;
	var Math_imul = Math.imul;
	var Math_fround = Math.fround;
	var Math_round = Math.round;
	var Math_min = Math.min;
	var Math_max = Math.max;
	var Math_clz32 = Math.clz32;
	var Math_trunc = Math.trunc;
	var runDependencies = 0;
	var runDependencyWatcher = null;
	var dependenciesFulfilled = null;
	var runDependencyTracking = {};

	function addRunDependency(id) {
		runDependencies++;
		if (Module["monitorRunDependencies"]) {
			Module["monitorRunDependencies"](runDependencies)
		}
		if (id) {
			assert(!runDependencyTracking[id]);
			runDependencyTracking[id] = 1;
			if (runDependencyWatcher === null && typeof setInterval !== "undefined") {
				runDependencyWatcher = setInterval((function() {
					if (ABORT) {
						clearInterval(runDependencyWatcher);
						runDependencyWatcher = null;
						return
					}
					var shown = false;
					for (var dep in runDependencyTracking) {
						if (!shown) {
							shown = true;
							Module.printErr("still waiting on run dependencies:")
						}
						Module.printErr("dependency: " + dep)
					}
					if (shown) {
						Module.printErr("(end of list)")
					}
				}), 1e4)
			}
		} else {
			Module.printErr("warning: run dependency added without ID")
		}
	}

	function removeRunDependency(id) {
		runDependencies--;
		if (Module["monitorRunDependencies"]) {
			Module["monitorRunDependencies"](runDependencies)
		}
		if (id) {
			assert(runDependencyTracking[id]);
			delete runDependencyTracking[id]
		} else {
			Module.printErr("warning: run dependency removed without ID")
		}
		if (runDependencies == 0) {
			if (runDependencyWatcher !== null) {
				clearInterval(runDependencyWatcher);
				runDependencyWatcher = null
			}
			if (dependenciesFulfilled) {
				var callback = dependenciesFulfilled;
				dependenciesFulfilled = null;
				callback()
			}
		}
	}
	Module["preloadedImages"] = {};
	Module["preloadedAudios"] = {};
	var memoryInitializer = null;
	var FS = {
		error: (function() {
			abort(
				"Filesystem support (FS) was not included. The problem is that you are using files from JS, but files were not used from C/C++, so filesystem support was not auto-included. You can force-include filesystem support with  -s FORCE_FILESYSTEM=1"
				)
		}),
		init: (function() {
			FS.error()
		}),
		createDataFile: (function() {
			FS.error()
		}),
		createPreloadedFile: (function() {
			FS.error()
		}),
		createLazyFile: (function() {
			FS.error()
		}),
		open: (function() {
			FS.error()
		}),
		mkdev: (function() {
			FS.error()
		}),
		registerDevice: (function() {
			FS.error()
		}),
		analyzePath: (function() {
			FS.error()
		}),
		loadFilesFromDB: (function() {
			FS.error()
		}),
		ErrnoError: function ErrnoError() {
			FS.error()
		}
	};
	Module["FS_createDataFile"] = FS.createDataFile;
	Module["FS_createPreloadedFile"] = FS.createPreloadedFile;
	var dataURIPrefix = "data:application/octet-stream;base64,";

	function isDataURI(filename) {
		return String.prototype.startsWith ? filename.startsWith(dataURIPrefix) : filename.indexOf(dataURIPrefix) === 0
	}
	STATIC_BASE = GLOBAL_BASE;
	STATICTOP = STATIC_BASE + 25648;
	__ATINIT__.push();
	memoryInitializer =
		"data:application/octet-stream;base64,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ywBiAJQAyQD7AF8AkQDGAPgANAACAAEAZQDMAJsAEwAVAAwAEQASABQAEAAZAA0ACgAOABgAFwAWABoACAAPADUAnAAfAGYAzQAJACEACwBnAM4ANgCdABwAGwBoAM8AIgAjAB0ALgAgAB4ANwCeACUAJAAnACYAKABpANAAKQAqACsALAAtADgAagCfANEAOQBCAEsAVABrAHQAfQCGAKAAqQCyALsA0gDbAOQA7QA6AGwAoQDTAD4AcAClANcAQwB1AKoA3ABHAHkArgDgAEwAfgCzAOUAUACCALcA6QBVAIcAvADuAFkAiwDAAPIAOwBtAKIA1AA/AHEApgDYAEQAdgCrAN0ASAB6AK8A4QBNAH8AtADmAFEAgwC4AOoAVgCIAL0A7wBaAIwAwQDzADwAbgCjANUAQAByAKcA2QBFAHcArADeAEkAewCwAOIATgCAALUA5wBSAIQAuQDrAFcAiQC+APAAWwCNAMIA9AA9AG8ApADWAEEAcwCoANoARgB4AK0A3wBKAHwAsQDjAE8AgQC2AOgAUwCFALoA7ABYAIoAvwDxAFwAjgDDAPUAAAAEAAYAZQCfANwAFgEHAAUAAwAvADAAMQAyADMApgCnAKgAqQCqAGYAoADdABcBawClAOIAHAFoAKIA3wAZAWkAowDgABoBbADjAGoApADhABsBZwChAN4AGAE0AAIAAQBtAOQAqwATABUADAARABIAFAAQABkADQAKAA4AGAAXABYAGgAIAA8ANQCsAB8AbgDlAAkAIQALAG8A5gA2AK0AHAAbAHAA5wAiACMAHQAuACAAHgA3AK4AJQAkACcAJgAoAHEA6AApACoAKwAsAC0AOAByAK8A6QA+AHgAtQDvAEsAhQDCAPwAOQBzALAA6gA/AHkAtgDwAEYAgAC9APcATACGAMMA/QBTAI0AygAEAVwAlgDTAA0BVACOAMsABQFdAJcA1AAOAVUAjwDMAAYBXgCYANUADwFWAJAAzQAHAV8AmQDWABABQAB6ALcA8QBNAIcAxAD+AEEAewC4APIATgCIAMUA/wBXAJEAzgAIAWAAmgDXABEBOgB0ALEA6wBCAHwAuQDzAEcAgQC+APgATwCJAMYAAAFYAJIAzwAJAWEAmwDYABIBOwB1ALIA7ABDAH0AugD0AEgAggC/APkAUACKAMcAAQFZAJMA0AAKAWIAnADZABMBPAB2ALMA7QBEAH4AuwD1AEkAgwDAAPoAUQCLAMgAAgFaAJQA0QALAWMAnQDaABQBPQB3ALQA7gBFAH8AvAD2AEoAhADBAPsAUgCMAMkAAwFbAJUA0gAMAWQAngDbABUBAAAEAAYAbQCvAPQANgEHAAUAAwAvADAAMQAyADMAtgC3ALgAuQC6AG4AsAD1ADcBcwC1APoAPAFwALIA9wA5AXEAswD4ADoBdAD7AHIAtAD5ADsBbwCxAPYAOAE0AAIAAQB1APwAuwATABUADAARABIAFAAQABkADQAKAA4AGAAXABYAGgAIAA8ANQC8AB8AdgD9AAkAIQALAHcA/gA2AL0AHAAbAHgA/wAiACMAHQAuACAAHgA3AL4AJQAkACcAJgAoAHkAAAEpACoAKwAsAC0AOAB6AL8AAQE/AIEAxgAIAUwAjgDTABUBWQCbAOAAIgFmAKgA7QAvATkAewDAAAIBRgCIAM0ADwFTAJUA2gAcAWAAogDnACkBPgCAAMUABwFLAI0A0gAUAVgAmgDfACEBZQCnAOwALgE6AHwAwQADAUcAiQDOABABVACWANsAHQFhAKMA6AAqATsAfQDCAAQBQACCAMcACQFDAIUAygAMAUgAigDPABEBTQCPANQAFgFQAJIA1wAZAVUAlwDcAB4BWgCcAOEAIwFdAJ8A5AAmAWIApADpACsBZwCpAO4AMAFqAKwA8QAzATwAfgDDAAUBQQCDAMgACgFEAIYAywANAUkAiwDQABIBTgCQANUAFwFRAJMA2AAaAVYAmADdAB8BWwCdAOIAJAFeAKAA5QAnAWMApQDqACwBaACqAO8AMQFrAK0A8gA0AT0AfwDEAAYBQgCEAMkACwFFAIcAzAAOAUoAjADRABMBTwCRANYAGAFSAJQA2QAbAVcAmQDeACABXACeAOMAJQFfAKEA5gAoAWQApgDrAC0BaQCrAPAAMgFsAK4A8wA1AQAABAAGAHkAxwAYAWYBBwAFAAMALwAwADEAMgAzAM4AzwDQANEA0gB6AMgAGQFnAX8AzQAeAWwBfADKABsBaQF9AMsAHAFqAYAAHwF+AMwAHQFrAXsAyQAaAWgBNAACAAEAgQAgAdMAEwAVAAwAEQASABQAEAAZAA0ACgAOABgAFwAWABoACAAPADUA1AAfAIIAIQEJACEACwCDACIBNgDVABwAGwCEACMBIgAjAB0ALgAgAB4ANwDWACUAJAAnACYAKACFACQBKQAqACsALAAtADgAhgDXACUBxgArAYgAeACKADwAFwE6AD4AZQGLAIwAJwGcADkA2wApAT8A2QCJAKoALAHeAEAAagA9AE4AJgFcAI4AjQCHAN0AKAEtAVcBOwAqAbgASQE7AdwA2AAJAfsA2gDtAGAB3wCdAFYAqwBXAKQAXwFvAC4BQQCyAHMAQwFIAMAAZQCzAF0ASQDBAJcAUQE1AY8AEgFFAEQBpQCWAGEAUgFuADYBSgERAUQAawCvAPUAcgBPAHEAvQD2AAMBrgBHALkAYABYAWQAQgFTAE4BPAFNAfwAoQBcAZMAUgANAegABAE0AWEBWwGjAOcAMgFAAbwADgGSALEACgFeAQABVQCVAHQAvwCgAO4AAgFQATEB/wBYAOAAYwBTAeYA5ADjABAB8gDxAD8B6QA3AWYASgC0ABMBQgDCAJgARQGsAPcA9AAFAXUAngCmAGIBSwCQAGwAOAFeALoALwFQAOoAWQDDAHAAVAG1AFkBPQFGARQB7wCnAHYAOQFGAGMBRwH9AL4AsAAPAWgAYgCZAGcAWgBMAAsBFQH4AOEABgG2AFQAmgDrAE8BqABLAcQAVQH5AKIAMwGUAF0BBwFBAQEB8wDlAGQBnwB3AEMAuwCtAJEA8ABNADABTAE6AVYBbQD+AFEAFgFpAFsAWgE+AbcA+gDFAEgBXwCbAKkADAHiAOwACAEAAAQABgCBANcAMAGGAQcABQADAC8AMAAxADIAMwDeAN8A4ADhAOIAggDYADEBhwGHAN0ANgGMAYQA2gAzAYkBhQDbADQBigGIADcBhgDcADUBiwGDANkAMgGIATQAAgABAIkAOAHjABMAFQAMABEAEgAUABAAGQANAAoADgAYABcAFgAaAAgADwA1AOQAHwCKADkBCQAhAAsAiwA6ATYA5QAcABsAjAA7ASIAIwAdAC4AIAAeADcA5gAlACQAJwAmACgAjQA8ASkAKgArACwALQA4AI4A5wA9AT8ASQBcAFQBUgBEAZUAYQGfAE4BpQBSAbIAowD+AE0AqAABAZkAVwE5APgA7gBPAPwApgBDAFAAyQBlAAsBjwCkAFUB/wBTAbsAeAE+AU4ASAFqAXMA6ADyAP0AIgEUAT4AOgCeAEQAXQCzAD8BlACpAJoASACBAUkBTQFYAWYAUwCQAOkAQwF8APMAwABiAe0AQAD3AMoA0QCWAHQATwEMAe8AKwG8AMQAKgFeAMMAAgF7AGsBgAFtAEUBcwGqAHIBVABuACcBtABKANIAvwBqACMBzQBvAX0BeQHOAGMBegB3AHgAfwGgAGkAbAAVAXwBJgEcAR0BWQHQAA0B+QBuAYIBLAEpAQMBfQBxAcUAYQDCAB4B0wAZARgBtwB0AVcAmwAbATsAXAFHAbgATABvAEoBywBdAUUAYgCYAJEAvQBCAEABUQGtAGYB+wDGAK4ABwEGAX4A8QDBAFgAhAF1AF8AgwFwAGcBHwH0AGcAEAEtAasAogDqABEBfwB1AbUAJAFVAHoBLgF5AGsAbAFaAWQB1AAWAdUAQQB+ASABzwBxAK8AYwAoAXYBcAHHAAQBuQBQAUsBoQAOAQgB+gDwAEsAXgGXADwAWQBBAZwAEgFoAUYBRgAaAacAkgBgAVEAWwCFAQoB9QCxAOsAvgAAAcwAVgGAAHYALwFoAHsBtgByAHcByABgACUBrADWAG0BFwFWACEBXwFbAWUBBQG6ALAADwFaAGQAkwBCARMBaQFHAEwBPQAJAZ0A9gDsAAAABAAGAJEA9wBgAcYBBwAFAAMALwAwADEAMgAzAP4A/wAAAQEBAgGSAPgAYQHHAZcA/QBmAcwBlAD6AGMByQGVAPsAZAHKAZgAZwGWAPwAZQHLAZMA+QBiAcgBNAACAAEAmQBoAQMBEwAVAAwAEQASABQAEAAZAA0ACgAOABgAFwAWABoACAAPADUABAEfAJoAaQEJACEACwCbAGoBNgAFARwAGwCcAGsBIgAjAB0ALgAgAB4ANwAGASUAJAAnACYAKACdAGwBKQAqACsALAAtADgAngAHAW0BtQDAAKoATwA5AI8BWgCfACkBeQFuARMBRAC3AIQBHgHCACsBXABGALYAkQGsADsAWwA6AJABcAGhAFEAoAAIAasAUACFAYYBegF7AcEAKgFFAAoBCQFvARUBIAEUAR8BuAA8AMMAUgBdAEcAcQGSAa0AogC8ASwBhwFiAEwAFgE9AAsBdgGHAJsBpwBmAHwByABXALIAQQBeAMwAfABIAFYBvQAxAX0BjAGxAS0B4gCXASEB7QBxANcAuQCAADUBkwF0AEABxABLAXIBpgGuAEAAiAFTAKkB2wCGALwAsAFwAKsBiwAXAaMAtAHQAL8B2gDsAOUAYQAmAYEB5gCmAAwBsQC7AeEAqgFlABABigB/ACIBdQBbAccAngFfAIwA8ACaAYsB0QCBABsBWgFpAPEAtQFWADQBwAHLAFkBugBrANwAnwFOAT8BagA5AXYAewBJAM8ApQHWAIABdQG2AT4AcwFVAUsAwQGoAEMBpADyAKABRAEwAcUATwGUAQ8BPwC/AEUBYACpAOcAGAE4AbsAlgFUAMkAZABDAH4BrwBQAcoASgENAYkBeAF/ASUBMwGZAbMAHQE6AS4BdAGOAb4AtABZAGMAZwDoAE4AWABNAIgAgwGlAMYAigF9ALAArAFKAHcB7gDjAEIAEQEaAY0AMgGcAXIAVQCCAFwBdwAjASgBggHpAI0BLwGVARwBvQGnAd0A0gDNAMIBbAASAbIB2ABXAVEBjgDzAEEBmAHDATYBJAF4AG0AGQG3AQ4BrQFMAScBogHTADsB3gBGAYMArgH0AEcBXQGhATwBjwBSAbgB6gBuANQAxAH1AHkAowFeAd8AhAC5AUgBnQE9AVMBfgBoAIkAvgFYAe8AswFzAE0BzgBCAdkA5ACoAcUBNwFfAW8AugHgANUAegCvAVQB6wD2AIUAkACkAUkBPgEAAAQABgCRAPsAaAHSAQcABQADAC8AMAAxADIAMwAGAQcBCAEJAQoBkgD8AGkB0wGXAAEBbgHYAZQA/gBrAdUBlQD/AGwB1gGcAHMBlgAAAW0B1wGTAP0AagHUATQAAgABAJ0AdAELARMAFQAMABEAEgAUABAAGQANAAoADgAYABcAFgAaAAgADwA1AAwBHwCYAJkAmgCbAAIBAwEEAQUBbwFwAXEBcgHZAdoB2wHcAZ4AdQEJACEACwCfAHYBNgANARwAGwCgAHcBIgAjAB0ALgAgAB4ANwAOASUAJAAnACYAKAChAHgBKQAqACsALAAtADgAogAPAXkBuQDEAK4ATwA5AJsBWgCjADEBhQF6ARsBRAC7AJABJgHGADMBXABGALoAnQGwADsAWwA6AJwBfAGlAFEApAAQAa8AUACRAZIBhgGHAcUAMgFFABIBEQF7AR0BKAEcAScBvAA8AMcAUgBdAEcAfQGeAbEApgDIATQBkwFiAEwAHgE9ABMBggGHAKcBqwBmAIgBzABXALYAQQBeANAAfABIAF4BwQA5AYkBmAG9ATUB5gCjASkB8QBxANsAvQCAAD0BnwF0AEgByABTAX4BsgGyAEAAlAFTALUB3wCGAMAAvAFwALcBiwAfAacAwAHUAMsB3gDwAOkAYQAuAY0B6gCqABQBtQDHAeUAtgFlABgBigB/ACoBdQBjAcsAqgFfAIwA9ACmAZcB1QCBACMBYgFpAPUAwQFWADwBzAHPAGEBvgBrAOAAqwFWAUcBagBBAXYAewBJANMAsQHaAIwBgQHCAT4AfwFdAUsAzQGsAEsBqAD2AKwBTAE4AckAVwGgARcBPwDDAE0BYACtAOsAIAFAAb8AogFUAM0AZABDAIoBswBYAc4AUgEVAZUBhAGLAS0BOwGlAbcAJQFCATYBgAGaAcIAuABZAGMAZwDsAE4AWABNAIgAjwGpAMoAlgF9ALQAuAFKAIMB8gDnAEIAGQEiAY0AOgGoAXIAVQCCAGQBdwArATABjgHtAJkBNwGhASQByQGzAeEA1gDRAM4BbAAaAb4B3ABfAVkBjgD3AEkBpAHPAT4BLAF4AG0AIQHDARYBuQFUAS8BrgHXAEMB4gBOAYMAugH4AE8BZQGtAUQBjwBaAcQB7gBuANgA0AH5AHkArwFmAeMAhADFAVABqQFFAVsBfgBoAIkAygFgAfMAvwFzAFUB0gBKAd0A6AC0AdEBPwFnAW8AxgHkANkAegC7AVwB7wD6AIUAkACwAVEBRgEAAAEAAgADAAQABQAGAAcACAAJAAoACwAMAA0ADgAPABAAEQASABMAFAAVABYAFwAYABkAGgAbABwAHQAeAB8AIAAhACIA//8MAN//RACJ/78A3f6uAYb9wwOw+dAO1TtA9ggF1/weAo/+9wBg/2AAzP8XAPr//P8YAML/fAAr/1IBAv7wAqn7rAZi9BsgUDCY8lkHTPssA9j9cAEV/4sAt/8eAPn/+f8eALf/iwAV/3AB2P0sA0z7WQeY8lAwGyBi9KwGqfvwAgL+UgEr/3wAwv8YAPz/+v8XAMz/YABg//cAj/4eAtf8CAVA9tU70A6w+cMDhv2uAd3+vwCJ/0QA3/8MAP//1k7dJcYMk/IwC4jrNQaz+lgCNQ8n+kb9swR/668E+xQw+j/9ufS4B4ID0QLc8IMQCOwAGfj7i+39DwDvhQxSCDT41fhYCgb5av49ArQJ6PFDDK36+vXgDoH9/ffj/UgJXA+K55gF7/EZE3IBNwJ1+9r0egcnAI72fg2fC0vwZw0iXtwocesF/QAIYfzZBgXzpAiMAp73twkt8g0QxfeK/o79rhCT6rsIQgcv9egCdAQF/bH53A8i7qYLdfvbArb7IwOnADb9XgLQ/X8CKwAa+ZwMIvWZAvsC6QAu+AsFTwdy8ggElgo48CgOiu+sFFLvGwZsALz9agZm9r0DIALsCQAA/v8EAP7/9v8mAKj/pQDt/qgBlf1nA0n7owba9ZsVzzad9wwDB//w/5kAK//iAC//rwB7/1sAyf8cAPb/AgABAPn/EwDf/y8AzP8rAPf/xP+vAJ3+cgLs+9UGPfN3KHcoPfPVBuz7cgKd/q8AxP/3/ysAzP8vAN//EwD5/wEAAgD2/xwAyf9bAHv/rwAv/+IAK/+ZAPD/B/8MA533zzabFdr1owZJ+2cDlf2oAe3+pQCo/yYA9v/+/wQA/v8AAAEA+f8WAM//XABn/+cAu/6vAeD9kAIG/VUDZfzIAyk8yANl/FUDBv2QAuD9rwG7/ucAZ/9cAM//FgD5/wEAAAAABAAIAAwAEAAUABgAHAAgACQAKAAsADAANAA4ADwAD4p9QnZuaoJaHUf8MPkYAAAH5wTP47h+pZKVvol2gsMFhACxAP0AHQE9AW0BjQHNAd0BIwCaOWZm4Xr/fwBAZ0HVQkxEy0VSR+JIekocTMdNe084Uf9S0VSsVpJYglp+XIRelmC0Yt1kEmdUaaJr/m1mcN1yYHXyd5N6Qn3/fwAArwUyC4wQwBXPGrwfiCQ1KcQtNzKPNs469T4EQ/xG30quTmlSEVanWSxdn2ADZFdnm2rRbfpwFHQhdyJ6F33/f/9/LnyueHZ1fXK6byltwmqDaGZmaWSJYsJgE196XfVbglohWc9Xi1ZVVSxUD1P8UfRQ9k8BTxROME1TTH5Lr0rnSSVJaEiyRwBHVEatRQpFa0TRQztDqEIZQo5BBkGCQABAHgY0BSkG5Q3/C1oZYRCzJ5AR5gmbE4gR0hX+PF0WjgU1GUQCRBqvGukdxw2IHzMIKCDHFHsiRyIMJjQLgCa5BWcnyDABKGURayraGTksAw6ZLAgHey18CcYt3AMYMOUT6zDdIB4xZmY5MUQNdDNXBuUzdwlqNMcXkzQKMlg1Fw4fN6kRQDfNBFk4TwdfOEIcbTgSCyQ5NCcMOlhEOTstDmk7uxbDO9AInjxyEi89JASPPSQfQz68LpQ+tAvWPqsGiUCeEMBAUBj+QUwJCkKpAj1D1iDKRFoN50WVFPhG5C02RycGr0j/fyhJtFTBSu8J3kuxGfZLARD6S2Ajk08lOswAuQHQAbkHZQM1BDAE9gsBBZcSbwYDBjUHbBs9B3oCywcgCS8JKDxlCo0Ejgo8D5YKlSd7DNgGqg1ACk8OUQOQD0EWdhBHDT8RGAVXEggIABXOEQoVpAKOFQJcvxVyHgwW9QsoFukFRRciCYUZJASUGm4XpBrnBhkb/Q5tHJ4BiRxpCiodKCwGHxoDRx++B0cfVgWGICEMkCDKEgQiEh8dI+cIRyMfBB8k8A1DJF8GtiWnGFMmLQqIJ6sCnydTEAUomgdfKMIE5CjoJpspuAvHKvoF2SqqFMMrAQk9LOoN+y1iGj8uOQelLo8Rsi4SBccudzvJLnMD0i4aC5YwXQgxMVEOXDGvIHIxOgZWMkQKuDJOE1ozWwSoMwwCHTRbDFc0gwftNEkXJjV5BVc1XwnWNUUPLDarKpI3uwaYN3sLxjdoHWc49hFzONgDejjZCMg5ewXiOXUNMzpNFqk6AjzIOpoH3TpfCi08dyUtPO8P0jwPHEc97ghLPVgGUz38C5w9HRT8PbUEYj64Ank/AA7SP30HKEAACmNAVhGRQAoZ7EC+LsdBTCKGQuoLiUKVR8RCIAbjQk0Ux0NBCN5D1AOeRGZmyURID+dE/3/nRr8eFUfUCRpHERb3SNMM8klaBUdLvTV1SxgQBEy1B8ZMIic0TYgayE0PFEhOGQvyUnlN3gFMBKUIwwx7EGYUNhhIHCUgwSNyJ2QrcC+AM1U32w7z/l/9Iv/n/Rf/Uv52/z3+LP+1/kD/D/+p/xn/Qf+A/7r/lv9c//r/SgBN/xsA3/+a/0oAXv9zAKL/rAD6/4IAcf/qAA4A2gC//w4BWAC2AIT/VQHU/30BJgBPAXUAEgGQ/8YBSgCvAfv/6AGvAIABrf8xAnoAEQIVAFkC5QDhAecALwHiAGACLAF0AdIAuwAyAQkBSAHZAX4BSwFzAYQAiwA6AG0BFQD6AK7/uwHaAOMBbgCqAZ8BQwLeAAYCTQE9AsABxwERAq0CSQFMAUQCUwJRAtQBhQL6AgUCRgHFAuUBGQOCAKwCnwLhAmIBbANYACYDv//CAt3/+AMKAWMEyPyM/Ev82/w4/l7+Rv5K/uP9J/++/ef8WP9E/rr94f4U/u7+2P3X/tT+Xf+z/pr+jv4Y/xj/Uf+a/mH/g/7r/5v+SP9h/17/y/9B/+j+EgD1/in/dv89AOX+RwCh/9r+DQBk/979AACt/7H/LABhAMT+sgDM/yv/3gD7/lr+7QCK/9T/jQCRAHz/awFRAOH+1QBBACIAlf9eAPv/WwDj/34Anf4zANf/Jf+0/5EAwf9kAPQAMf0sABsAxP2E/5sAWf6FADsBa/xHAOAA9P4+AYMAo/9C/6QBn/96AOsBsf89AWMBggBkAEUBVgDb/tIAhQACAaEAsAC3/9EBwwAsAYABXAEWAN0AeAG3AJkBeQEeAcoA8gDVAJMCAQE1AvgAWAGYAbT/lQG4Af0BZAKBAXsBGAJfAtgAyP9GAsAAZAAFAjcCk/7AAb0B2AJbAQoA+QFlAfcCfAJGApICTwEFAlQDegEpAzwCPf9uAz0DEQLDAtsDlgPWAogB4gTlAycE2/y6/Pr89v2N/cT8I/4a/qX92f4f/ob9kv6A/nf+Rv9i/nT+E/92/pb/BP82/+3+w/9P/0b+rP86/zn/Tf+D/+H/uP/R/13/1v4k/9cAwP9Y//sAe/+cAMX/4v/+/38ANgBCAMP/F/8VAPsA0QDO/yAAIQDCAIgAi//u/9sBygAuADUBAAG5ADUAIwDIAIYByAAHAfIAKP8uASYBgABmAQAAEwCvAR8B4AC/ARgBbwGlANUAjQE6AT8BfwF7AUsAFQFFAc4BigH5AU4B+wBiACv/wgGZAMABNQLiAEwA1gF/AfYBewKGARYB7QCHAGwCVgGRAYkCSwEnAgYCggCiAVACEwIyAeEC2QKFAUQC8QEtArsCKAF/AWoDGwFwAvcCfgBuAtwBLwJTAtgBfgECA2gCzwJlAukCHAJ/AqADBQI6AyEDrAIrA1wC8AISA1kDpQOVAl4BtgLCASUEMgKPAxsEOAMtA1AE9gIXBHIDdASVA3kDDwTeBJIFywWCBlQH+Pyq/IX8aPzY/Z79af0b/b/+jv4k/sv9EgFg/zj+yQAJAUMAYP/O/vj/Lv9PABABowDsADMBNAFCAj0BQAAqAff/xQBWAWwCVwHoADoBbgKtAJUAJAIPAmQBcgHhAXgBhwC8AegBLAKHAdcB5wGNAuQAqAFAAkMDpgF0AdICqgInAaECtQJ7AhsCVAJOAsEB2wFqApMCMgPfAgUC6wGhAloCWgEBAW0DcQJ7AlED0ALXAjIDugJTAo0C4QGyAnMELgP6AsACjAP7AesCggOoA1ADVwOcAxEDhgINBHIDGwMEA00DAAR/BG0E1wMyA5kDrAMsBOQEFgU0BucGtgbpBdb8kfxP/AL/+AC4AJ8CgAAgAb8ClgNjAJICLgKWAtsAKAJJAo4D0AAvAiQD9wJ3AF4CBgOZA3X/DgP5AuwC0AD0AsQC1wM4ACACYAPyA5gA4QK6AtsDKwEDA5wDbwNnABgCEQPBA5UBmwKUAyEDSAHiAsECBQO3ATcDZwPgA2MBgALsAxwEcQHUAjYDtQNVAp8BjwLZAuIB8QOAAxkDawGMAyMDrwLn//gDRgPzA70AswNYBK4D3gCSAxkE1QMPArwD2wPzA4j/DQMZBGEEXACaBB0EdAMvAGMEIwSeBHYApQPMA/0EZQFVBJYDTQT3AQ8EBgXEBD0BRwW3BPIDRgHiAi4FIAn6DfQRHhY3GjIeLiIZJtEp0C0hMpM2wzrFD0MCOQQLBIYBAwD5/jr/rv8mABIAvP/0/zkB+QKVAfkAbwC0/+QC7wQMBe4D5QP7A/kD0AObA6X/OwO0A4gCZQIXAgoC6gGlASkA1P/n/ij+jAIWAsEAhwCm/ykAh/+c/sT/lwIzAT0A0P+o/i0CsgMZBGMDTgPeA1gE7gTZBIr/NP9IAQACZgMZA2ICkgG6AJwAJQFKAK7+Jf5//K79X/8P/uIAgwB2/zMBqQDx/lz/ff6Q/T4A4P/D/wT/4/3E/P379f1q/WYAw/+NAHAA8v4F/+P9GQBq/wYAfP+c/lL9oP++/vb94f+6/tz/L//3/Rv/MwF8//v/nf+A/jwAzf8T/2T9M/xp/jz9tf9U/xoAdv/2/m8A0v4rAOr+nP6Z/joCNgPwAWb/yP6k/4kAFwFzAW7/cAGZAUQABgBNAKcAygCiAHkCggPkA/QClgKrAg8DjQPkA5n/JgFfAp8B4wHOAeABrwGYAYj/rv6c/fT9SAJLAVwAsQEUAU7/2/5m/9f/DQFkAPf/1QCgAD4D4AIWATQD5gSuAsgCDwTZASb/0P7PAcYBjQERAcoAHgERARj/BwAGAHz+KP5V/ob+Wf+c/9r+Sf+GANH/ZQCo/6z/i//9/zkAEQA2/4b9I/yh++v9sADc/3gA5P8XAG8Awf4+Aer/s/8KAfH+MP5O/m79gP1//n/+nf+7/zr//f72/tT/2f91/3f/qwBCAAkAb/+H/rL8GPyR/7v+VgGHAK//4v6E/sAAx/8zAUwA6P90/6UCvgL3ADgA+QCNAJf/FP+d/yQA2f+7/1wBxgCj/0IBWwC4//cBdQPkBRsFAgWUBF8EuQQlBKABzwLdA8sE6QMcBLoD5QIUBIH/iP5v/YsAbwLfAPUBMgHcAI//gP7k/PgBtgFVANUArf8+/0kCbATRBEME3wSZBegFqAUiBVL/Wv4HAIMEQQSeBOsDsQMmAwgAgv/D/pn/of5J/Z7/9P7n/SEAmf/e/qcA2f9p/iwAMP+J/mgA6f/A/93+g/2t/MT7w/+Q/7X/zv5O/toAbP+e/lj9e/8o/4f/h/4y/Z//fv+X/mT/hf6p/cj/Av+2/esAnQAq/wsA/P5r/4T/9f5z/rz9r/3x/dv8f/5aAT//SP48/aH+c/8B/w3+bf9H/8ABlALuAdAA/QHNAVIBIwGVACH/WABPAZ8A1AC/AB4BNAHNAOH/1QEjA5MCawKSAksD2wNZBFX/Dv8CAmoBJwEMAigCtgJJAsD/zP5A/uv/HAESA74BIQFcACb/ev75/6kAzgBKAWABmAFmAdz/vgK/A1sDXQNbBPUETQUZBXv/q/6//6YCoQG4AeYBBgIMAyEA1P9B/6j+M/4N/Tf/2QDh/5/+3f3U/3sAw/+8/7H/HQA8AEkAx/9q/gL9JftN+/AAkAGlALf/5v6n/Sv/Vf+J/kwBIwCZ/+P/Mf/X/ST+gv10/KwA6v95/0D/Ef9c/5n/kf/R/5kAfQBuAP//Nf/G/fr7cPrp/ZsAAQCTALP+c/2f/Dv/Yv/r/9T/XwBsAIUBTALqASEAE//0/Yz9eP/8/igAT/8y/sUBXgN8AYMAfv9r/koDjgYxBw0GwgXoBDoEiQPmAnIBwAToBmEGvAR8AhYAtv5HALT/5/4b/Rr9ggNrAhUBRwAi/+D/9/7U/ef/4gOqAjEBfgBb/0kA4gJ9A8gD4QPoBuEIMAdvBbv/o/63/eoAhgSHA3IC/gH7AP//nf/w/i7/pf2h/uT91fyB/vD/Gv8I/poBlQAz/6n+df2B/WcA9/8d/zP/zv3z/Mn7SPtk/48APwB5/73/w/6m/fD8fvuA/XD/ef5e/ZL9OP8C/2z9Tfx1/tj/Bv+P/RsAHwJeAH3/fv5f/YX/jf4L/T3+zP2a/WH+Of3d/4z/y/6v/fT+7wDf/67+dv15/14A+wAqAjkAyP5Z/mb/x//rAPT+uf99AXIA1P+p/30ArQCFAOkFsgbWBBYCFAE7Ac0BywH8AX3/7f99BJ4C5gFkATUBcQEoASH/C/59/C79uv8GAIMANgGKAZ3/0f77/fkAQADL/4cA9f/FAW3/cf4m/W/+MQPiAiID7QI/Amb/Tf4d/SADUQJuARECPgFGASD/LQDZ/33+/f36/aD9gP6//sX+h/6PAJv/j/+H/k//cP/0/3UAKAAR/3X95fu7/R/9Ivy4/hoAzv9j/+n/O/7l/u393v3AAAT/C/4Z/bP9jf0N/rj+iv+4/7z+Ev4M/87+cP9P//r+ef+y/9z/Fv/5/T/89vrG/iH+jf7T/6H/3P7p/fj/1P5wAFz/6/7GAJ3/gP9wA0QDQwJfARcAof8n/+X//v58APMDVQKpAZAABwC3/6UBDQVoBlcGzgZRBtsFBAXuA6H/8AKQBiEGUgacBbAE1APIArv/1P5V/U3+bASDA/gBTAFtALb/vf6D/TMCMgRgAnMBaQDP/7L/PwOqBFYEYgXJBdQFVQXBBP3+h/+gBTYFXAbSBZ4FxwSlA67/zv6b/SL/hv5d/d/9Yf2z/DUAhP+l/qYBNACD//L+7/0JAE8Ap//A/mr9GfxR+yX7XP3X/rz/7/6d/YkAbv9z/o39s/wk/5D/pv7j/Mb86gB8/0T/6v72/WH/a/4i/V3+JQFKAFn/Wf+4AGf/S/6//Mj7sP4o/s/9rP4D/1f/Wf7M/Hj8ff/t/6b+pP0fACEA4f84AT4AbP8xAMX/NALmAc7+s/7CANT/QwBIAJMAzQDzADH/z/9QBdcDyQPfA/YDVgTNAy3/VP9zA3MCxwKiAsECHgPqAqj/u/4F/TL8rwKMAwICfgGsANz+nP3b/D8AgwAOAQMBYAFcARX/rP+7AzIDYAQJBRcGyAUFBUz/M/6a/ZECswLpAlYDDwPJAp//y/4j/pr99/wi/QD98v0o/qj+JP7d/1f/MQCz/2r/EP9z/8z/9P6B/Wn8Avun+6r+s/5p/7z/Dv+3/bf/L/8i/mH/U/6FADv/Df4T/Az78P4g/5f/vf8RAJX+lv1i/oz/wv8UAAoAdABsAD3/Jf52/BT7hfxH/uv+cv/k/x7/+f1K/ET97f72/oz/l/9SAJQB/wEIAkcBEQA+/7P+6P22/Y7/fv8UAe0AzABWAYcA8P+R/54CuASQBFwD5gJZAhACkwE1AY0BbQLGA/ACQwKOAZABSQH8AL8AtAB3/y3+EAFqAKH/EQBA/7D/3v6O/cIAVgLEABUA5/5NAP4BYANUBCcDqwOGA50DzQLhAYkAbwEWAvwCngJ+ASgBmQBUAC8B8QGQAKv/g//l/R7+MP4E/ekAWwFEAG3/qQAu/w7/Hv8e/jMBpgGaAFH/fv4u/Sz9ePwJ/DUBNAGgAMT/Kv5c/qr96fwl/0QAeQB3/9D9bv9C/v39Ev4n/YIANQAd/y4A2gEgAF//QP8W/tUApAC5/y/+lPxf/zj+tf3Q/9oAdQAnALEAPv+o/x7/Xv4yANIAIwI5AhcBeQDU/87/CgCs/zoAjAC2APv/CwF1AGoA0wDGABsCQwORA88CaQIgAk8CNQKCApkALwJoA8wB3gBsALwAtAC3AJ4AdwAcAWf/8f7lAFcAbgDH/0n/UgB2ABUADQAoAHYAvwC5AKIAeQOOAmwA3v/0AOgBMQIUAqMAOABhAlUBMgBJAUQACgHaAGQAzgASAND+lf9M/hn+v//O/qr/mgCGAOL/0/+3/5j/sP+g//UASgEKAEj+r/zG+08AKAD3/sQAdAEQAUv/E/57/hMBUADF/wIA9P8K/wf+nP9M/hUARf9R/iP/0P8kAPH+Rv9t/5P/GgBHANUAjABIAKH+lP2s/5X+RQAuAFsApwD9/6H/nf+X/9D/cgCTAAMB+QCsAF8ClgE0ADsAQ//A/nMAq//K/z4CgADiAMX/A/+CAML/CQQcBQsEZwRKBAUEwQM3AycAbAH1AqwD2AKUApMCRwICA43/rv4I/Sn+igElALkBsgAGAMf/z/7z/RwDxQG8APz/jv/4AEcAvAEdA9sCSASFBMYEBQQrA4cAZwEnAqkB7QIvA2oDwAL2AYQA9wAAADL/P/4S/f7+/v2H/fgA+QBbAHkAPf8N/qb/5v5N/k4AFADr/pH9Kfw4+2H+Nv6B/VsB/QHQAE3/MP4o/bT/E/8a/pn/qf4M/Tf99/6f/UH/cv6E/Yf/gf4T/TcC/ADc/57+X/7O/8wAZABr/3b9x/vR//n/+f5vANL/TP/1/rz+zv12/kz9jgEkAeIBngKrAnACugGlAHQAJABr/2wA9wAjAfcAYwF6AG0A4AAoAfL/sQPeAyED8wIvA08DkQN8AyQBXQHVAuIBhAFJAa0BbAKbAt7/xQDVAIH/VADuAWwCPwJ3AX4AzwCsAKcAagHKACgBiwHHAfr/+gAbAtMBfAIhA30EBwVeBBsA8ABxARgBuAGbAXoCfAO5A58AqgDG/3X+4/xO/U0ALf+y/vv/5P/z/7b/sf6l/SwBWAAz/1IA3/+U/kb9Tft/+24Abv/f/nEAAQAN/7T9HvwQ/p4BoAAqAMj/Cf9I/kv9HPwh/gsATv+b/mn/n/65/i3/rP6NAEEAqQHFASIAV/85/lz8QfuKAPMBAAFEAUQAiwDx/939Iv4RADIB9gHhAeD/ev+9AYEAcf8M/wn+Bf6p/T0AdP+n/vABygH+/xQAHf/+/YoB5QaCBjsFXQQmA4IC3wF8AdcABwKYAx0EQgQXAxACIgGbAMr/F/95/ab9fwImAf7/Wf9G/rL/xf7p/I//NAOTAZ4AjP+c/hECOwfTB8wEbgLX/2D+WAEzA5f/hf4U/8gEfQPtAjgCZAHWAO//Of9w/zIA5f4J/779svzB+0UA9f+D/jL/0QDk/n3+YP40/ScA+/9v/4r+Vv1z/M77b/vW+x8B4gBDACP/av1V/1v+fv09/Xz/pP7m/UD+7P/8/57+FP1b/AQAtf/f/qr9PQE0ADD/1/7R/aj/+P6a/rP9if0I//X9yvzR+0YA+P82AMb+/f1cAG7/7v4T/scAPgCHAZ4Ac/9HACX/Nf8x/5gAKABJAaIA4/8wAGv/bAB/AHsCIgRzA+wBdAE4AT0BEgHxAAsB0gLoBHIDcQL4AAgAr//E/8b/dv/d/qj99P/+/9n/kwB1AJX/p/7//csBTABcAPD+hAEGAWoBBALLAGf+NP3B/LX+uQDRAIv/ef7W/p8CJAEaAgEBpgDa/5r/wf4+/+X+w/36/r39Jf9E/hX/TgALAFj/m/8b//n+v/6F/0YAMgBW/6n9HPy0/fn+/P05/ooBawHlAHj/5v0VAEn/pP43/4T/kP6A/ZH8sfwv/2f+Ev79/YH/q/7j/Vf+Av72/wT/J/7d/lQAu/83/1z9nPxnAMn+fP/A/gUAU/9E/9f+jP3FAMf/BwD1/zEAYP84AC4CbwAhAMn+SP4x/v//Cv/N/l4DxQGLAFb/nf4Y/xcBxgNqBsYFtwVjBBsDDQJTATv/2v+mBjMF5AS2A7QC+AGqAZT/qP6j/Gz7vAFiAVgA0v8k/8v/v/4S/lkE6AJsAcYA3v+1/8kBuwOZBL4EkwWxBUEFlQMbArv/xwCBA3QEPwWfBNED5gIKAnoALADz/hsAZf/O/c3+sv37/JoAKgBg//wAf//P/in+I/2N/ocAuQCu/2D+Lv1v/Aj+Gf2Q/JUA1gCs/7f+WP29/Fb+a/2v/4D/hP4h/Rr8r/4RAEr/Lf5H/az/3v4C/rD9DQC4AZoA2v/p/kYAw/8K/yn96fuw/4P+6f1A/bIA/v9u/2L9VvziAYoAPwBBAPX/DwAEA7sBjgDs/y//gv9f/+D/B/9fACgCfAAeAKn+UgCq/5QA7wLrBVEEYwNeAtoBwAGPAV3///6DA0kEigPvAvYBhgEmAc3//v5B/tr8kP77AtABbAG3AFr/iv6R/lcAIwCPAaIBWANBAzP/yv5MAgoDEQMpBF4E3QSFBFP/yP5rAFkBkAEWA2YDWQTpA/n/iP99/mb+mv1R/B7/gP4V/jX/4P7N/7X+pv9O/2j+w/2u/jgA4//v/o397/vi/An/Lf6UAEIA/v8z/zP/wf2j/sf/oP7G/9P/H/8p/mT8D/5NAOD/LAB5/+v+Ff4P/gr+WP42/3f/TQBgABoATf8r/hD8FPsGAd3/fP/9/r7/GP9B/uv96/xB/5z/9f5sAU0FIQVwBBADtgG1AJEAfAKIApsCOAK6AdkAagGrAbgBogIMAkwBdQBf/nkAJwHUAdEB5gAsACP/bf8Q/5UAUACGARYBagBe/tT9KAL/AesAkACh/ysAwQASAZYAQwAiAO/+1f+C/6sAoAEaAT8Anv6M/qr/qP6U/6L/Sv+n/6j9uPw4/9EBAgH1/wP/0P9JAWEA3v7h/eX8nv7G/Yv/uwAKAHv/YP60/5b9f/8J/43+LQC0/xUBAvzJ+34A2gH+AH8ANADn/kwAWf+X/uX+2f3l/on/zP///4YA4P80/2H+KAQ7A30CrALQAdEADADiAaABwQFzAU8BJgHCAM8CQAJtAYcAcQBbADn/KgGwAO0BbgHCAKMAJADd/xT//f7c//z/YwCYAJ7/zv7l/+QAWgBvAKr/WwANAC3//v6W/1YAwP9JAN3/x//h/6IAIwBA/5P/sf6L/b7/w/+A/0IBEf5j/Sj9wQAfACT/egBEAV8Ap/+l/2f+Ov1m/wAAFv9cACEAqf6f/ST/qf5o/iT+cf1n/1IA3gAW/hf9Af8xAND/hwCB/3cAvf+4/nr+8P7f/cj/x/9+//b/+f9c/9H/6v/YAygEwQM4AtIA5f8QACsDswLyAgIC4ADd/6YAlgLAAmoCggE5AC3///7+AWcBogGJAVsAcP/u/z//4f/l/98AWQBx/xgAkP+e/9cBPwG5AAMArwD8AJIA0f8QATAALf8W/5IARQDLAGwBRADM/zMA/f4i/kf9o/4K/Qv+PwAL/v/83/5PAMn+D/6W//sANQAV/yv+gfyM/JEAYP7Z/YwAe//1/fn8LAC6/ln+N/0P/qr/Uf5jAAv9/Pxg/7T/0v/g/3sBVQDd/zj/b/5p/fD7Cf9M/7b+pP+I/hsASf+S//8EPgQNA/YBRAGkAJ0AqgLSAcEBFQGSABwAmQF7AtgBhgFrABj/5v11/8QAjAFMAdUA0QDj/6//lgCh/8j+TACz/8D+zv8uAAkALwCvAIsAHgCAAdoAzgDo/wb/oP/s/kn/GgB3ACYADgD8/3v/zP8j/pr9Jfw1/Yn90/zIABj9D/zX+xf9if1V/xIAd/8F/x3+m/0s/E37DACj/QH9zv1S/cD7/f06ADb/VP7y/ND7oP8W/03/IP47/dL7f/x9/6T/QQFv/z//AP4n/cT9A/0u/7X+t/3z/Yn95/4w/9H+jQRQBKsDPAPMAqoBmwAGAJP/NAMKA58BcQDl/30BUwE6AQkBeQD3/yb+i/4vAEgCugFjABn/j/8Q/tr/4/4GATEBqgAEALX91P1FAEIA1wFiAQ0Adv9GAO7/agBDAKcA0v5D/nP/uQC/AJcAUwB7///+9/0w/Tr/hgDS/0r/zfxw+/f8AAJnAV8Aj/+JAP7/tv92/2/+jv+N/g7/Lv7MAN8A4f8s/0D/7P2D/S7+Uv0AARUBdf+L+yT7g/61/8r/DgBYAMn+cwBx/w3+qf58AGD+mP1t/3n/KwD8/3kAj/5DAw8DgQKGAWMBXgFAAEgAwgC7AdMBtAHbAHQB0AFxAcAABABk/7j/Hv85AM4ALwHNALwAZQAJAdj/M/8Y/kj/FAFAAOb/J/9P/tf+iQBIATQB3/56AVEAzP4v/jkA2//jAJz/GADc/2n/xwAIAI8AVv5H/d37e/+EAaEAQQF8/QH8CfsnAEIAhf9GAHQBsQBT/9T91/3Q/kP/i/+P/lf+hv8y/mj/t/93/a78W/sB/fEBaAHeAOL8jftR+kL/rgHqALMAKgCi/2v+TP0mADb/Cv9X/5L+3v6o/8D/IADc/vIDmwOqA8YC0QHmAFYB2QAsAR4EowJEADb+Tf9OAMUBPAESABP/EP4N/6cAFQCoAdcApf/R/lb/3v6v/7r/vf8oADYAxf+f/lX+pv81AF4ACQA2AOT/PgEbAQ8AEP/G/08Atf+H/+UAIwA6AAYAe/+h/v79GP2+/D/9d/+kAJz7lPrh+xr/t/8oACQAXf8X/+z97/xu+0f9YADs/EH8Cv9S/pD9W//4/6j85P2K/XX8r/66/0wAV/zu+239I/0w/8cA5v/1/U4Anv8L/pv8hvyv/5D9Qf3T/6T+5/9XAEb/7QM3AyIC+QBaAOr/zwAqAY0BfQE/AcgAPgAvAdkBewGFAAn/iP1H/ksAHAHQAIcBcwDn/ywAXwC4/08Aof/B/3//2/7LAFz/o/5zAHoARQD//3oBXAGqAGMAOgBN/9L+vABC//7/lgAXAM3/9f/YAJn9ofy++2363vzQ//r/P/wE+/T5Kf3G/zgA3wCE/wH/z/0k/AP7bP+u/yD+bP2F/Fn7xfq7/hQAk/1r/PD6uvoIASEBMgC0/AL8v/rP+tv+LgAWAfz+LP7D/Gj76/3Q/bL/Kf8c/sr8L/vp/A8Adv8VBSUF7gQYBMwCZQHA/0ICOAOdAyIDdgJqAWYA1gGdA/8CAgJHAb4AkP/hAOwB7wG1AVYCgAHT/ysAUgDW/68ABwJWAcD/0P5m/58AQAKTAd0ARwHWAPQAegDC/zgBXABg/9oA0AA2AQwBMgFDATn/4/7z/rH/hP9x/2f/7AAz/4D+Vv5YATsAR/9I//D+9wB+AC7/+v0s/k4Anf+I//YBoADo/tP9MAFZ/u//5f5F/tcA1AB0/8z9VP0c//4BaQGCAEMBVP5PAWIAv/8kACn/Cv+W/jMAbAHw/xb/lgBb/5IDcwPvAo0CpALQAWf/dwIhAhcC0AJUAmgBr/8PA8gCAAK3AVUB+wB5/vEBoQH5AHQBJwGtAD//gACS/3/+XQAnAK0AGf/YAMX/A//OAYUBmgBFAMcBDgH8/6/+z//pAL7+MwGPADUA2gCAAOwAZP/b/0b/EP9l/pL/CQCPAXT/k/6M/QIBfAHWABUBgwDGAbEA4/74/WwAKv9NAHP/yQCF/xb+ff88APL/Pv/3/Rv9EQFqAd//lv7K/eH+HP+hAO0APQHz/sMAtf+J/jT/CwBNAID/+P5k/yH/Jf4JARsA1gR7BJQDsQKwAdIA6P4gA5gCbwPWApsBoABc/8YBrgIYAhMBkwAuAG8ALwHmAQACYwHxALUAu/9PAFwAHQCTAOkANAARAFX/IQGDALcBDwEDAPb/nQHxAJAArgCbAP7/DgA6ANkA9wDbAJUArwDu/+QA+P8Q/zL///1B/8oAoP/w/jr+IQDU/sH9LgD2/5T/Cv+l/v786f0JALr+Uv7D/7/+QP3V/skA///o/qX9Xf5H/xIA3P/8/fb9hf7d/kv/n/8bAGH/x/7z/SD/Av7B/Dv/3P41/sX/yv7O/XH/of4qBJADdwKFAc8AVgAg/1QCAAJUAvkBOgF6AND/EwNdA7kBo//R/iEAQv8BAdUBUQEzAA8AKgGj/ycBSQCJ/xkAJAAXAGwA5P/9/+D/cgAVALkAawDiATEBDwDp/sH+NABgAOIALgBzAEgAeP+FAIP/EgAx/9H9sv0J/h7+QQHF/ev8SfxU/0f+5v1xALUADgDK/n/9F/w2/58AeP93/k/+//1x/HD/6v9IAPf+Pv1G/GH/NQBMAa7+sf2s/IH+df44ACwAKwBi/zD+f/yJ/WP/2v5f/4D/uP7D/R3+g/8LAPkDigMbBO0DpwJVAZr/ZwFOAR8GIgXTAmkACgC//9YCEQItAdwAKwDv/gL+tAHPAjYCZgGzAHIA0P0qAYUAiP9WAeEADgB9/Jv/2QBpApABkgDG/9f/YAFSADz/JwB5AFn/LP87AL8BHAGnAfoAV/+N/hz+rP0eANf/+QAWAIz+dv3m/N0BvQHYALH/oP4TAREARf5f/FwAEwBF/Uj9rwEIAc//yv62AC78J/9S/nD+ZQAFAUgAX/yH/Jv+8//PAXoB7ADG/DgAHgDV/pj+gP/N/5L81f6R/0sAQQAkAAMAMQNwAef/YgG5Ak8CU/81AdQA3gDvAuQBjADI/1ECewFGAPj/AgG0AG4ApQDS//8AKQHbABEBaQCgALr/mv5L/3sBSgE/ARL/j/46/+QCRAI/AXH/yQBtADb/OP5IARQBc//LAKoAbwAqAM8AaAG8AKf+cf7//Rf/igKmAVEAhf0//Dz7zwEbAswA0QDKAOf/Pv8O/u38wQBx/z/+5v3DAJb/tf5EAD4AHP8j/rj8wP09AYAAGwFh/Vf82fyO/4cBTwHC//YAAgDG/ln90f60AKj/lf/w/loAOv/k/yIBkP91A30E/QPIAvABGQGt/w0B7AETA4MCWwFGAHwAUAF8AvMBXAAb/03/vwAaAJIBNAJUAZUA9f+HAEj+MQLWAcwAuP9G/4wAMP0OAGMB5QBEAHv/0QFuADYBZwAMAGoAHQCeAE7/cQChAI4AeQBzABsAdf1i/nv9aP9c//P/U/6B/VD8V/2Y/6//NABD/2n9XP/E/lX9Rvwz/63/n/1j/VT/+/1K/RsBsP96/Wj/gf5a/Qr/2P9x/xX95PwX/Xr+nv8rABMBqf05/3L+T/5M/ub9HwCt+8j9iP73/oL/6/8BAE8DPQI0AYgBMQFlADcAEQElAckACwFaAckAewDXAuAB4gACAL//dv+kABEB0ACtACQBDAD9AK4AVAHPALQAWAB0AC4A2wE0/lr/4v8NAG4ArQCMAYkAWAArAHf/ov8iABwBYADy/+IAKAA/AEYAggAt/iH9DPxq+83+MQG9/5z9aPyG+8n9+P9cAOf/Sv/x/hT+Dv2n/B8Btf8S/u38T/1V/Tv9iQC6/uD+2v15/K/7TgFBAcL/nv5z/b78Q/4BAHkBaP9e/87+oP1X/Nf+9wBA/xb/I/4M/xj+9v5WAbT+SQGZAfkA3//5AaAA4//y/0YC+v5/AGIBkQDtAK8AaP/1AHoAGwAqAFQBrP+j/zcBHQHeAGT/LwDV/wj+6gB5AIEBaADD/i0AsADDAAgAaADF/6L/sQA1AMAA3v+B/5gAOgIVAd7/vf+3/oH9Y//w/s4BT/8y/sYAQgGzAHMAfv6rABMAEwD0/8MAiP8E/8kAMAEkALD+gP8j/4T+qwBH/ygBDv/I/hcAxgAnABAA/f9P/5H/bwCj/0wApP8h/wQAsQCWAdT/WP98AWv//P8RAUsBXP4BAhUBFQD3AC8Axv+DAP7//f+GALQAb/8oAK8AvQBKAG//5f/T/7v+cgGO/+v/rf9h/lP/TQBfAM3/2P/i/73/RwBYAFYA3f+e/w4ARQDFALL+PP9PABn/pP53/9oAoP6n/6v/LwDJAH7/W/8lAPH/1f8DAFYAX/+U/08AUwAVABP/r/9r/xL/lgBG/wX/Rv8H/17/7f9CAHX/5v/O/0v/GAALAAAAfv+X/57/gf82ASoADv/FAAUAaf9UAO//Kv9/AGv/Cf99/58A9P71/qH/J/8BALH/8f6w/0f/0/+0AZ8ApQDHAIcB3/9RALsAvv/W/2MB1v7H/1cBlP/n/eIAcP/p/8EAsABu/lcANQAoARkArP/9AJj/xv9pAIL/V/+uAMb+0P8sANr+XP9f/g7/df8DAD7/Zf8x/y3/dwBCAdUATQEyAHwB7QD3AP7/0gHw/8kA7gAB/5X/QwBI/mv/egCo/3X/WAAJ/7f/1//nAKcAwv+bABAAv/8QAE0AvP/+/8H/af/U/qAA7v+z/jYAyP+i/wUAAgBC/w4AXACUANEAbAAJABABbAAjAG4AjgCr/5EALwBj/xcBAwDA/vYAKwC4/0QAVgAn/4cAJACMAE8AOACvAM//GgAtAAMASQA3AJv/bQBJ/w7//P/l/g7/MAC8/9D/+v9n/4b/oQDEAGAA6ABQAL4ApQBhAAsAAgHh/0cACwGz/6X/NwEv/1cAmADy/+r/lgBr/wkAvP4tArsAgP4zAS4ABf8bAE0Ak/5NAMz/Hv6s/6AAWP79/cD/2v6I//z/JP6M/5P/n/8+AW0BagBzAr0BQv94AB8Bbv9BAGsCVf7yAGsBl/6N/rABpf5mAKgAi/3DAPL/v//cAdH/1/5AAVj/yf9kAfj+ef5SAOL+zf/h/9T9Tv9x/rb9M//P/5j+qf4S/6/+3ADJAToAMQLTAQMBVAEOAVj/wgFNAOj+PACnAGP+hQAE/xT+2ACdAN7+GgEAABH+Hv8lAbcAY/+HAHoAYv/F/ycAe/+K/5//tP7L/nEAYP9X/vr/a/8t/xgAsP/r/qb/9f99AFIBggC5/9EBBQDT/7gA7QCh//0Adf87/ykB7f/U/v8Bwf9o/4sA+gDf/lABfABTAWr/IgCwADD/qwCmAIz/XgAmABv/SwC//63+sv8z/3/+AADi/13/yP+S/w7/QQH0AMIA+QHuAP//PQF0AEEANQFYALb/xAHN/87/TgEn/97+0wApAGj/7gDJ//z+9v+XAGcBiAAqAd8A/wCY/yIBpwEGALcA8v7z/p7/zP+u/w0Arv/u/p//WgAK/7j/1f66/6UBqP9tAa4BuwDC/n0BfAElAOgBi/7E/k8AzP6b/wUAef89/ggASABb/mb/tACqAIf/PgCxANj/RgFQAJf/+AAHAfv/WP9L/yP//v/p/2L/8v9r/4f/dwCl/23/dwBMAWf/MQAvASIAugHJ/7v/2QDGAToAmf5F/4n+1v8yAO7++P/1/gf/VQCq/6b+s//Y/1kBWQCGANsAnACw/6AAbAAoAHQAYv8y/x0ABQDg/68Av/9i/5IANwCy/0kAjv8i/2EB0f9RANMAMQBp/wwBaQAEAC4B+f58/7cAaf/k/8kAT//N/qYAZQAj/4IASgA6AJ7/IAAsAA0AwgAeAHL/qgBgAAgAeP+J/6X/v/8IAMn/AwBE/wwALQDB/8//lQDr/+3/GACQAF8A/gDq/zwAoQDEAGAAYv/D/zAAuv8hAFIA6f+//joAmwBt/wUAlP5IAU0A6//FAa0AlP9SAHYCbwEHAdAA1P7C/1D/M/+PAGL/V/9m/vj+AQHz/pz/hP0hAf7/3P5zAq0Agv6V/oMB+AAMAr8B9/2R/5X/df52AO7+qf5Y/YP/VP9B/mn9SwCUAJH+sf8HAaL/+QCUAOL+fAEPAV7/cv/8/0b/x/9vAIP/3f+U/wL/ZAAdAA7/sP8vAfj+sv/QAcf/+ADq/xL+lQKWAiwAP//Y/7b+Tv+RAK/+pv85/3D+2P/p/w7+QP9yADsB1//0AL4AWACf/+UB8QBQANQACv8oAFcAZP+TAIYA/v+y/u8ANAE1/24ANf77AKYBJv82AeQAqv+m/o4CuACvAKkBH/7B/6kAo/51ALwAg//Q/TYBngBg/l4ALgCrAED/wf+dAA4AAAHd//H+QgF7ADUAKv8EALT/ZP9WAO7/gAA7/xj/CQGm/57/zP5MAW//ff80AToA/QE7AK3+MgLEAPL/hv5kANH/Fv/KAAEAaADy/hP+PwEu/7v+sf+n//z/Vf9NAC3/oAA//2IAeACZ/0MBIADq/3//SABOAPT+tgC0/77/NQFjAG//G/9j/6z/gf5iALn/pv+g/gwA5P5O/7IAv/+D/1r/qf9R/6H+KgA6/9D/mgB0/w3/s/8SAGwA2f9jAVsAVwAIAJsA/P+eAO8AgABfAMr/BwD2AIT/AgEPAFkAzgDYAGIAN/8JABIAyP7pAMwA2f9S/5sAcP/3/xwBx/9GALv/Y/+7ABIANgDi/xcAGACHADcAqQCOAIn/cwDOAOz/XgDiAJb/OQHr/xAAwv+hAEcA/wCn/2UAR/99AEgA4v83/1gB/v4hAPj/UQCY/2b/SAAoAZAAvP/0/uf/UQCy/6n/agAWAJsARv+J/9L/5P8bAFsAjv/b/1H/3/+i/yL/Q/96AHz/if9B//L+VP9T/xIA1f8XAYcA1v+A/7sAqv/lAHb/nwDwAIwALgBFABkA4wBNABUAcwANAAgARAAI/34AUQBq/4kAzwD3/2b/e/8hAUMAjwDb/6r/uv60AOD/EwDp/xoAqAB0ABf/4P/m/3YAsv8DAPj/0/+N/zkAKf/K/63/L/9wAOr/Wf+l/2n/qAD6/sz/oP/UADsBt/9SADT/awGIADv/gv+1/rcA2gCPAM//1/8tAuYASAACALf/owB5Ad0AhQBvABYB1wCS/5r/7P8cAXEAEQFUAD8BIgESAFUA5//7/30AhAA0/9r/+/8eAff/nP50/wD/XAB1AEP/cP+/ADkBMwCe/6cA9v8sAPcAJAB9AcUA7gBKAAYAJgBo/h0A/f+r/1wACgGdAOf/OP+hAIf/RgBUAHT/8P+q/3AAov9D//P+8v5fAWsA6P+8/73/7AGZ/2X/y/99/z4AegAKAIcAVAAbAcn/iP/0/yX/SwGv/6cA3AB4/5MAVP/W/4wAof+T/6j/Pv8AAP7//P/f/4P+vv8n/5gARv9u/vQAbACcAHT/df5xAHj/PP9uAOj/1gB2AAsAwP99/5L/4v76/7T+EABeAGEATwDd/jP/+//Z/+z//ACg/0wArgBlAKMAPQC7/xH/yf+PAQYAjf8/AaQAEwHEAPH/JADR/0sBeQDiANEADwFFAbgADQCw/yb/1wFhASABegEQAM3/+wCuAHQANACVAOn+6wAUAScAeADQ/wAAlP+U//EArf6j/xYCLQAhAKn/wgCVALn/lQHU/5kBcgFRAEb/Zv8ZAJr/QP58AFP/FgCYAZL/yv4q/+b/FwCt/3IADgCS/6QANADfAK7/JQDn//n+MgHx/y7+nwEkAaUA7v8dAO3/Vf+bALYAswCQAOX/5wACAZn/Cf90/u4AcQB3AWb/k//8/5wAYgBVANz++/+E/3QAiwCM/57/2v7y/63/6v6L/4b+agAhAJb/qP4c/ncAEQBk/ooApgCAAWUANP9YAGT/h//k/tT+//9a/xgBIQBo/8f+r//b/xYA5QCZACUAxP+t/+wA+P/X/1f/HP9+AOz/awEV/xEAbAFk/5wA5//i/0gAkACcAJkA5v8AAWEAkADr/9v/MAC///oAPwBNABEBgP98AH//5v8oAAkAjf/6/1IAJgCm/0r/sP7z/xwAngBbAOL/8QCJAFb/7/+SAA4A9f8hAD0AwADFADYArP9VABcAOP+y/+P/jAB6AO0AagCr/ogAx/9y/6v/8P+2/8X/pv/4/0X/7P8t//X+2ABN/5L/zv/5/9wA9f66/8f/1v/v//H/RwAgABUAPwB3/yEAd/9R/2gAvP9hAL3/1f+FANP+3QCM/zj/r/+k//D+wP/X/8r/DP8k/+H+Dv/O/6n/p/8L/+wAZgBa/9n+QgAYAF7/uf9fAEIAiACm/yT/3P+e/1//Iv9E/x0A7v8SAO3/Yf4JADEAPQBkACcAyP+R/1IAhwDh/zQApv9n/6P/vQC2ACr/JwF3ALb/HAECAIkAJQAvALYAXAB1ALgAy/91Aev/8v/d/4gAhwGSAIEAXP/k/00BXABQAKz/ZAB6//j/2QDg/wMA0f9p//sAKf+OAFwAIP82AVT/7f5iAJ8AmwBP/3AANQDNABsACAAQ/8AAqQB4AMH+N/9qAAsAJACq/xP/xwGT/2b/Xf+uAMn/2v8gAJv/sv/F/zP/v/6f/0UATwDK/iwAEgBH/yIAjf/s/2z/2f/LAOP/mgDi/2L/pgDT/33/w/7o/2sBW/8z/5D/Iv8JAeD/1P9q/zYAP//6/9r/Af9X/43/9v5XAEP/3P9X/8T/qf/2/kz+Vv+8/6//6v4YACYA6f/t/2X/AP+NAMP/Hv/L/VH/RwAJAOP/E//9/QcB1v76/18AHwAr/6n/hv8FAQQAz//QAA4Af/+S/x4AdgAq/wIBbgAV/9f/7v+C/3gAZwBBAH8A2/9+ANz/6P8ZAHb/vf/q/kb/XP8+/zf/TgAt/6n/zf8j/1L/sf+i/9n/FwD6/2P/EP8WAJL/Z/+8/5QA+//+/2v///95/9n/Tf9EAGgBi//x/4kALwDq/pIAiAAEAYcAQQA9AHQA0/9hAOcAewFXAIj/UgGxAPD+AwAKAZwAHAC7/wQBVACr/1YA9v6aAAD/Sv/v/7//0P76/9j/rwBp/0z/5f8bAKn/wf95AHIAWv8r/p8Avv+9/hn/1gCYAHP/LP+JACQASP/N/+b+E/8oAAoA0P8V/9v/+wDK/73+iAAdAKj/Uv/VAMYAev5jAMH/if5rAFf/XP+oAUUAkf+NAFn/SgB//0EAkACf/jH/M/+T/2D/fv6d/mIAUP8T/uz/cf8E/1D+/v/YAKb/Uv9Y/2X+DQDk/hv/YP+p/+n+IgAF/7X/+f7G/9b/pAE1AC3/mv6AAd3/iv6MAUQAHP9DAf7/pwDN/sAAwgDLAUkB+/+0/ncBTwD5/zkBGgGE/8gApP8PAV7/uv+0AGP/1v7+/cv+OgBd/979EgB8AJT+pwAS/1MAZf6L/2AAjACQ/3z+kP0DAXv/w/4pAKMAfv/A/7L+4gBb/4T/kv8u/sP/BgDlAGf/zQBv//IAYf8wAMMAlADG/xwAHwAXAdH+uQAXAfz/w//FADsAVgCO/3sAqADM/yMAJABkAH4Aaf5mALP/2P+u/v//qv6cAE3/aQDe/5//R/9UAN3/bAB7/2sApf+b/kz/NgAb/xgA1P8vAC8ASv++/w0ALQAEAK3++wBAAOIA1v9lAKL+EwGd/44BjgB5AG8ADACa/wQBAAD5AQQBov+hAB0BoP/gAPz/zgA6ASEApwCLAFgAzAAV/zwBxP/n//j/av/I/skA3P8kAT0AmP/Y/64AXv8qAOv/kgHj/6H+FQCYAJj+o/85AL8A1AA8/0wAngDr/7v/uP5H/0sBdwDL/x0BOABRAZX/6P+VAR0A7v+JABABFQEB/xYArQBB/ycBQgFFAS4BFQDl/0wBTv93AA0ADwGBADn+TP90AEH/Hf8+AGz/DAJQ/+H+GgFj/w3/DQDHAK4Bxf/P/3MAk/5IAFT/d/9dAHb/gv+NAKz/BQCE/yYA7P/+/jcBWQLVAF4AggDD//YB//9j/+UBOQGSALb/ngBZARQBhwAYAcf/6gH8AGMAKwALAbb/rQFpABYB6f93AF4A4v3oAQEBjf+s/wz/Sv7eAY//3/2DAWUAof/O/m8A8gFfAKYAFgDT/qQB8f/G/7L/DgEdAHoA5v6gABD/MgDa/1EA7v9EAOX/hv/o/vz/LQBP/9EA4v94/7b/gwDU/2UAtf+o/9D/d//K/wv/5P8/AO7/kP+Z/zoAsf/6/9wAv/9yAN3/zv9tAL//jwCO/4EATAB9AKYAWgDD/w7/ugC2/9X/0v+k/zEAHf8YAGX/JwBDAFUAYwDW/zUASP/n/o4Ahv8AABUAcv/x/+//3wBcAOv/0P+u//L/Wf8zANv/Df/i/6b/EgDI/zYAaQBKAFYARQANAJv/xABIAKf/KwBBABMAJwB5ACIAgwCu/xkA1QBk/2UAmv94/+v/OQDWABYAJACE/80AzAA6AGT/rf9TAIv/iQCJAFUAdAAsAKT/bP+8/wsAmv87/yT/tP9H/8b/hADm/0n/VQD5/+H//v8XAM0Aaf8KAOX/2//7/+7/JAGDAAEAdQBY/wkAo/9QAMX/g/9K/wz/YgDo/4cA6v9eAN0AYQBqACoAKwBg/1MAGQDA/+v/BgAOAPH/mgB+AA8AdP+WAPb/Mf+O/08Awf8t/7r/5P8n/6UALgAmAOr/GQGEAML/bQBwADYAkP+j/9AAGwAoAXMACgBt/ykA2AAqAOz+MgCN/wL/pwB1AP7/PQARAJAAIgC4/0b/av8QAeP/vv+n/6H/a/+BAPsAegAAAM7/Fv+l/yQAGgCX/5r/qP+H/xT/+f/1/zT/bQAFAEH/aQDx/6MAsP8gAOj/L/8pACYBRgCW/6L/NP+K/3gAzv/b/67/D/8uAH3/4/+WAMn/IQCbAHgAp//4/wcAPgDVAFIAPQASAF//kACYAB4AgwBBAKn/Af/v/5X/+P9VAMD/MwBe/98Ay/96/wUBRQDI/9oASACR/wIAmwCP/6n/MQBVAOT/Xf8qAP//PP8HACcAC/8OAHf/sf8LAGD/ygDb/qL/IQDQAGQAOADU/0YBsv/X/+gADQBy/+MAUADw/6n/yQAhAHv/DwBJ/8b/QP/R/7gAgP+FAGMAM/8LAGX/TgA0AEgAjQAK/xoAYwCXADsAcwDA/7H/0f/w//L/BgAvANX/uP9O/+X/ogBwACsAUv9R/+4AugBHAMr/RP+0/x//6QAnANn/Yv96ACwA5v8rAFQAggCj/83/FgADAFwAav+IAEr/x/9hAH3/swCy/1AAWwBb/1oA/v+UAA8AggBBAK8AdQB2/3IAd/+EAAMA9v9G/4wA/P/b//4Awv9cAJP/KA5BEt0VTxkBHbogbCQYKMorri9PNPw5gkHHTOFe2H8=";
	var tempDoublePtr = STATICTOP;
	STATICTOP += 16;
	assert(tempDoublePtr % 8 == 0);

	function ___lock() {}
	var SYSCALLS = {
		varargs: 0,
		get: (function(varargs) {
			SYSCALLS.varargs += 4;
			var ret = HEAP32[SYSCALLS.varargs - 4 >> 2];
			return ret
		}),
		getStr: (function() {
			var ret = Pointer_stringify(SYSCALLS.get());
			return ret
		}),
		get64: (function() {
			var low = SYSCALLS.get(),
				high = SYSCALLS.get();
			if (low >= 0) assert(high === 0);
			else assert(high === -1);
			return low
		}),
		getZero: (function() {
			assert(SYSCALLS.get() === 0)
		})
	};

	function ___syscall140(which, varargs) {
		SYSCALLS.varargs = varargs;
		try {
			var stream = SYSCALLS.getStreamFromFD(),
				offset_high = SYSCALLS.get(),
				offset_low = SYSCALLS.get(),
				result = SYSCALLS.get(),
				whence = SYSCALLS.get();
			var offset = offset_low;
			FS.llseek(stream, offset, whence);
			HEAP32[result >> 2] = stream.position;
			if (stream.getdents && offset === 0 && whence === 0) stream.getdents = null;
			return 0
		} catch (e) {
			if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
			return -e.errno
		}
	}

	function flush_NO_FILESYSTEM() {
		var fflush = Module["_fflush"];
		if (fflush) fflush(0);
		var printChar = ___syscall146.printChar;
		if (!printChar) return;
		var buffers = ___syscall146.buffers;
		if (buffers[1].length) printChar(1, 10);
		if (buffers[2].length) printChar(2, 10)
	}

	function ___syscall146(which, varargs) {
		SYSCALLS.varargs = varargs;
		try {
			var stream = SYSCALLS.get(),
				iov = SYSCALLS.get(),
				iovcnt = SYSCALLS.get();
			var ret = 0;
			if (!___syscall146.buffers) {
				___syscall146.buffers = [null, [],
					[]
				];
				___syscall146.printChar = (function(stream, curr) {
					var buffer = ___syscall146.buffers[stream];
					assert(buffer);
					if (curr === 0 || curr === 10) {
						(stream === 1 ? Module["print"] : Module["printErr"])(UTF8ArrayToString(buffer, 0));
						buffer.length = 0
					} else {
						buffer.push(curr)
					}
				})
			}
			for (var i = 0; i < iovcnt; i++) {
				var ptr = HEAP32[iov + i * 8 >> 2];
				var len = HEAP32[iov + (i * 8 + 4) >> 2];
				for (var j = 0; j < len; j++) {
					___syscall146.printChar(stream, HEAPU8[ptr + j])
				}
				ret += len
			}
			return ret
		} catch (e) {
			if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
			return -e.errno
		}
	}

	function ___syscall54(which, varargs) {
		SYSCALLS.varargs = varargs;
		try {
			return 0
		} catch (e) {
			if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
			return -e.errno
		}
	}

	function ___syscall6(which, varargs) {
		SYSCALLS.varargs = varargs;
		try {
			var stream = SYSCALLS.getStreamFromFD();
			FS.close(stream);
			return 0
		} catch (e) {
			if (typeof FS === "undefined" || !(e instanceof FS.ErrnoError)) abort(e);
			return -e.errno
		}
	}

	function ___unlock() {}

	function _emscripten_memcpy_big(dest, src, num) {
		HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
		return dest
	}

	function ___setErrNo(value) {
		if (Module["___errno_location"]) HEAP32[Module["___errno_location"]() >> 2] = value;
		else Module.printErr("failed to set errno from JS");
		return value
	}
	DYNAMICTOP_PTR = staticAlloc(4);
	STACK_BASE = STACKTOP = alignMemory(STATICTOP);
	STACK_MAX = STACK_BASE + TOTAL_STACK;
	DYNAMIC_BASE = alignMemory(STACK_MAX);
	HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
	staticSealed = true;
	assert(DYNAMIC_BASE < TOTAL_MEMORY, "TOTAL_MEMORY not big enough for stack");
	var ASSERTIONS = true;

	function intArrayToString(array) {
		var ret = [];
		for (var i = 0; i < array.length; i++) {
			var chr = array[i];
			if (chr > 255) {
				if (ASSERTIONS) {
					assert(false, "Character code " + chr + " (" + String.fromCharCode(chr) + ")  at offset " + i +
						" not in 0x00-0xFF.")
				}
				chr &= 255
			}
			ret.push(String.fromCharCode(chr))
		}
		return ret.join("")
	}
	var decodeBase64 = typeof atob === "function" ? atob : (function(input) {
		var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
		var output = "";
		var chr1, chr2, chr3;
		var enc1, enc2, enc3, enc4;
		var i = 0;
		input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
		do {
			enc1 = keyStr.indexOf(input.charAt(i++));
			enc2 = keyStr.indexOf(input.charAt(i++));
			enc3 = keyStr.indexOf(input.charAt(i++));
			enc4 = keyStr.indexOf(input.charAt(i++));
			chr1 = enc1 << 2 | enc2 >> 4;
			chr2 = (enc2 & 15) << 4 | enc3 >> 2;
			chr3 = (enc3 & 3) << 6 | enc4;
			output = output + String.fromCharCode(chr1);
			if (enc3 !== 64) {
				output = output + String.fromCharCode(chr2)
			}
			if (enc4 !== 64) {
				output = output + String.fromCharCode(chr3)
			}
		} while (i < input.length);
		return output
	});

	function intArrayFromBase64(s) {
		if (typeof ENVIRONMENT_IS_NODE === "boolean" && ENVIRONMENT_IS_NODE) {
			var buf;
			try {
				buf = Buffer.from(s, "base64")
			} catch (_) {
				buf = new Buffer(s, "base64")
			}
			return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
		}
		try {
			var decoded = decodeBase64(s);
			var bytes = new Uint8Array(decoded.length);
			for (var i = 0; i < decoded.length; ++i) {
				bytes[i] = decoded.charCodeAt(i)
			}
			return bytes
		} catch (_) {
			throw new Error("Converting base64 string to bytes failed.")
		}
	}

	function tryParseAsDataURI(filename) {
		if (!isDataURI(filename)) {
			return
		}
		return intArrayFromBase64(filename.slice(dataURIPrefix.length))
	}

	function nullFunc_ii(x) {
		Module["printErr"](
			"Invalid function pointer called with signature 'ii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)"
			);
		Module["printErr"]("Build with ASSERTIONS=2 for more info.");
		abort(x)
	}

	function nullFunc_iiii(x) {
		Module["printErr"](
			"Invalid function pointer called with signature 'iiii'. Perhaps this is an invalid value (e.g. caused by calling a virtual method on a NULL pointer)? Or calling a function with an incorrect type, which will fail? (it is worth building your source files with -Werror (warnings are errors), as warnings can indicate undefined behavior which can cause this)"
			);
		Module["printErr"]("Build with ASSERTIONS=2 for more info.");
		abort(x)
	}

	function invoke_ii(index, a1) {
		try {
			return Module["dynCall_ii"](index, a1)
		} catch (e) {
			if (typeof e !== "number" && e !== "longjmp") throw e;
			Module["setThrew"](1, 0)
		}
	}

	function invoke_iiii(index, a1, a2, a3) {
		try {
			return Module["dynCall_iiii"](index, a1, a2, a3)
		} catch (e) {
			if (typeof e !== "number" && e !== "longjmp") throw e;
			Module["setThrew"](1, 0)
		}
	}
	Module.asmGlobalArg = {
		"Math": Math,
		"Int8Array": Int8Array,
		"Int16Array": Int16Array,
		"Int32Array": Int32Array,
		"Uint8Array": Uint8Array,
		"Uint16Array": Uint16Array,
		"Uint32Array": Uint32Array,
		"Float32Array": Float32Array,
		"Float64Array": Float64Array,
		"NaN": NaN,
		"Infinity": Infinity
	};
	Module.asmLibraryArg = {
		"abort": abort,
		"assert": assert,
		"enlargeMemory": enlargeMemory,
		"getTotalMemory": getTotalMemory,
		"abortOnCannotGrowMemory": abortOnCannotGrowMemory,
		"abortStackOverflow": abortStackOverflow,
		"nullFunc_ii": nullFunc_ii,
		"nullFunc_iiii": nullFunc_iiii,
		"invoke_ii": invoke_ii,
		"invoke_iiii": invoke_iiii,
		"___lock": ___lock,
		"___setErrNo": ___setErrNo,
		"___syscall140": ___syscall140,
		"___syscall146": ___syscall146,
		"___syscall54": ___syscall54,
		"___syscall6": ___syscall6,
		"___unlock": ___unlock,
		"_emscripten_memcpy_big": _emscripten_memcpy_big,
		"flush_NO_FILESYSTEM": flush_NO_FILESYSTEM,
		"DYNAMICTOP_PTR": DYNAMICTOP_PTR,
		"tempDoublePtr": tempDoublePtr,
		"ABORT": ABORT,
		"STACKTOP": STACKTOP,
		"STACK_MAX": STACK_MAX
	}; // EMSCRIPTEN_START_ASM
	var asm = ( /** @suppress {uselessCode} */ function(global, env, buffer) {
		"use asm";
		var a = new global.Int8Array(buffer);
		var b = new global.Int16Array(buffer);
		var c = new global.Int32Array(buffer);
		var d = new global.Uint8Array(buffer);
		var e = new global.Uint16Array(buffer);
		var f = new global.Uint32Array(buffer);
		var g = new global.Float32Array(buffer);
		var h = new global.Float64Array(buffer);
		var i = env.DYNAMICTOP_PTR | 0;
		var j = env.tempDoublePtr | 0;
		var k = env.ABORT | 0;
		var l = env.STACKTOP | 0;
		var m = env.STACK_MAX | 0;
		var n = 0;
		var o = 0;
		var p = 0;
		var q = 0;
		var r = global.NaN,
			s = global.Infinity;
		var t = 0,
			u = 0,
			v = 0,
			w = 0,
			x = 0.0;
		var y = 0;
		var z = global.Math.floor;
		var A = global.Math.abs;
		var B = global.Math.sqrt;
		var C = global.Math.pow;
		var D = global.Math.cos;
		var E = global.Math.sin;
		var F = global.Math.tan;
		var G = global.Math.acos;
		var H = global.Math.asin;
		var I = global.Math.atan;
		var J = global.Math.atan2;
		var K = global.Math.exp;
		var L = global.Math.log;
		var M = global.Math.ceil;
		var N = global.Math.imul;
		var O = global.Math.min;
		var P = global.Math.max;
		var Q = global.Math.clz32;
		var R = env.abort;
		var S = env.assert;
		var T = env.enlargeMemory;
		var U = env.getTotalMemory;
		var V = env.abortOnCannotGrowMemory;
		var W = env.abortStackOverflow;
		var X = env.nullFunc_ii;
		var Y = env.nullFunc_iiii;
		var Z = env.invoke_ii;
		var _ = env.invoke_iiii;
		var $ = env.___lock;
		var aa = env.___setErrNo;
		var ba = env.___syscall140;
		var ca = env.___syscall146;
		var da = env.___syscall54;
		var ea = env.___syscall6;
		var fa = env.___unlock;
		var ga = env._emscripten_memcpy_big;
		var ha = env.flush_NO_FILESYSTEM;
		var ia = 0.0;
		// EMSCRIPTEN_START_FUNCS
		function la(a) {
			a = a | 0;
			var b = 0;
			b = l;
			l = l + a | 0;
			l = l + 15 & -16;
			if ((l | 0) >= (m | 0)) W(a | 0);
			return b | 0
		}

		function ma() {
			return l | 0
		}

		function na(a) {
			a = a | 0;
			l = a
		}

		function oa(a, b) {
			a = a | 0;
			b = b | 0;
			l = a;
			m = b
		}

		function pa(a, b) {
			a = a | 0;
			b = b | 0;
			if (!n) {
				n = a;
				o = b
			}
		}

		function qa(a) {
			a = a | 0;
			y = a
		}

		function ra() {
			return y | 0
		}

		function sa() {
			var a = 0,
				d = 0,
				e = 0;
			a = Mb(44) | 0;
			d = a;
			e = d + 44 | 0;
			do {
				c[d >> 2] = 0;
				d = d + 4 | 0
			} while ((d | 0) < (e | 0));
			c[a + 16 >> 2] = Mb(954) | 0;
			b[a + 32 >> 1] = 0;
			b[a + 34 >> 1] = 1;
			b[a + 28 >> 1] = 0;
			b[a + 38 >> 1] = 0;
			b[a + 40 >> 1] = 0;
			e = Mb(qb() | 0) | 0;
			c[a + 4 >> 2] = e;
			ob(a, e, a + 8 | 0);
			return a | 0
		}

		function ta(a) {
			a = a | 0;
			Nb(c[a + 4 >> 2] | 0);
			Nb(c[a + 16 >> 2] | 0);
			Nb(a);
			return
		}

		function ua(e, f, g, h) {
			e = e | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			var i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0;
			q = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			j = q;
			p = e + 26 | 0;
			b[p >> 1] = (h | 0) == 0 ? (d[f >> 0] | 0) >>> 3 & 15 : 15;
			a[e + 24 >> 0] = 1;
			o = e + 16 | 0;
			i = e + 30 | 0;
			eb(f + 1 | 0, c[o >> 2] | 0, i, p, 1, e + 38 | 0);
			a: do switch (b[i >> 1] | 0) {
					case 2:
					case 7: {
						b[p >> 1] = b[e + 28 >> 1] | 0;
						h = 0;
						k = 6;
						break
					}
					default: {
						h = b[p >> 1] | 0;
						b[e + 28 >> 1] = h;
						if ((b[e + 34 >> 1] | 0) == 1) {
							h = Wa(c[o >> 2] | 0, h) | 0;
							k = 6;
							break a
						} else {
							h = e + 32 | 0;
							n = h;
							h = b[h >> 1] | 0;
							break a
						}
					}
				}
				while (0);
				if ((k | 0) == 6) {
					n = e + 32 | 0;
					b[n >> 1] = h
				}
			if (h << 16 >> 16 != 0 ? (b[e + 34 >> 1] | 0) != 0 : 0) {
				h = 0;
				do {
					b[g + (h << 1) >> 1] = 8;
					h = h + 1 | 0
				} while ((h | 0) != 320);
				h = 0
			} else {
				b[e + 36 >> 1] = rb(b[p >> 1] | 0, c[o >> 2] | 0, g, j, c[e >> 2] | 0, b[i >> 1] | 0, c[e + 8 >> 2] |
					0) | 0;
				h = 0
			}
			do {
				k = g + (h << 1) | 0;
				b[k >> 1] = b[k >> 1] & -4;
				h = h + 1 | 0
			} while ((h | 0) != 320);
			f = e + 34 | 0;
			if (!(b[f >> 1] | 0)) {
				h = Va(c[o >> 2] | 0, b[p >> 1] | 0) | 0;
				b[n >> 1] = h
			} else h = b[n >> 1] | 0;
			if (!(h << 16 >> 16)) {
				e = 0;
				b[f >> 1] = e;
				l = q;
				return
			}
			pb(c[e >> 2] | 0, 1);
			e = b[n >> 1] | 0;
			b[f >> 1] = e;
			l = q;
			return
		}

		function va(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0;
			e = b[c >> 1] >> 2 << 16 >> 16;
			e = N(e << 1, e) | 0;
			j = d << 16 >> 16 > 1;
			if (j) {
				g = d & 65535;
				f = 1;
				do {
					h = b[c + (f << 1) >> 1] >> 2 << 16 >> 16;
					h = N(h, h) | 0;
					h = (h | 0) == 1073741824 ? 2147483647 : h << 1;
					i = h + e | 0;
					e = (h ^ e | 0) > -1 & (i ^ e | 0) < 0 ? e >> 31 ^ 2147483647 : i;
					f = f + 1 | 0
				} while ((f | 0) != (g | 0))
			}
			if (!e) return;
			i = (((gb(e) | 0) & 65535) << 16) + -65536 >> 16;
			h = e << i;
			h = (h | 0) == 2147483647 ? 32767 : (h + 32768 | 0) >>> 16 & 65535;
			e = b[a >> 1] >> 2 << 16 >> 16;
			e = N(e, e) | 0;
			e = (e | 0) == 1073741824 ? 2147483647 : e << 1;
			if (j) {
				g = d & 65535;
				f = 1;
				do {
					k = b[a + (f << 1) >> 1] >> 2 << 16 >> 16;
					k = N(k, k) | 0;
					k = (k | 0) == 1073741824 ? 2147483647 : k << 1;
					j = k + e | 0;
					e = (k ^ e | 0) > -1 & (j ^ e | 0) < 0 ? e >> 31 ^ 2147483647 : j;
					f = f + 1 | 0
				} while ((f | 0) != (g | 0))
			}
			if (!e) g = 0;
			else {
				k = (gb(e) | 0) << 16 >> 16;
				e = e << k;
				k = i - k | 0;
				e = (ub(h, (e | 0) == 2147483647 ? 32767 : (e + 32768 | 0) >>> 16 & 65535) | 0) << 16 >> 16;
				f = e << 7;
				g = k << 16 >> 16;
				if ((k & 65535) << 16 >> 16 > -1) e = f >> (g & 31);
				else {
					a = 0 - g & 31;
					k = f << a;
					e = (k >> a | 0) == (f | 0) ? k : e >> 24 ^ 2147483647
				}
				g = vb(e) | 0;
				k = g << 9;
				g = (k >> 9 | 0) == (g | 0) ? k : g >> 31 ^ 2147483647;
				g = (g | 0) == 2147483647 ? 32767 : g + 32768 >> 16
			}
			if (d << 16 >> 16 <= 0) return;
			f = d & 65535;
			e = 0;
			do {
				k = c + (e << 1) | 0;
				d = N(g, b[k >> 1] | 0) | 0;
				a = d << 3;
				b[k >> 1] = ((a >> 3 | 0) == (d | 0) ? a : d >> 31 ^ 2147418112) >>> 16;
				e = e + 1 | 0
			} while ((e | 0) != (f | 0));
			return
		}

		function wa(b) {
			b = b | 0;
			var c = 0;
			c = b + 60 | 0;
			do {
				a[b >> 0] = 0;
				b = b + 1 | 0
			} while ((b | 0) < (c | 0));
			return
		}

		function xa(c, d, e, f) {
			c = c | 0;
			d = d | 0;
			e = e | 0;
			f = f | 0;
			var g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0;
			g = f;
			h = e;
			i = g + 60 | 0;
			do {
				a[g >> 0] = a[h >> 0] | 0;
				g = g + 1 | 0;
				h = h + 1 | 0
			} while ((g | 0) < (i | 0));
			s = d << 16 >> 16;
			t = s >> 2;
			if ((t | 0) > 0) {
				d = 0;
				r = 0
			} else {
				h = f + (s << 1) | 0;
				g = e;
				i = g + 60 | 0;
				do {
					a[g >> 0] = a[h >> 0] | 0;
					g = g + 1 | 0;
					h = h + 1 | 0
				} while ((g | 0) < (i | 0));
				return
			}
			while (1) {
				q = r << 16 >> 16 << 2;
				o = b[c >> 1] >> 2;
				j = d << 2;
				b[f + (j + 30 << 1) >> 1] = o;
				k = c + 2 | 0;
				i = b[k >> 1] >> 2;
				b[f + (j + 31 << 1) >> 1] = i;
				l = c + 4 | 0;
				h = b[l >> 1] >> 2;
				b[f + (j + 32 << 1) >> 1] = h;
				m = c + 6 | 0;
				g = b[m >> 1] >> 2;
				b[f + (j + 33 << 1) >> 1] = g;
				n = j | 1;
				p = b[f + (n << 1) >> 1] | 0;
				d = 16384 - (o << 16 >> 16 << 5) - (b[f + (j << 1) >> 1] << 5) | 0;
				g = 16384 - (g << 16 >> 16 << 5) - (b[f + ((j | 3) << 1) >> 1] << 5) | 0;
				h = 16384 - (h << 16 >> 16 << 5) - (b[f + ((j | 2) << 1) >> 1] << 5) | 0;
				i = 16384 - (i << 16 >> 16 << 5) - (p << 16 >> 16 << 5) | 0;
				o = 1;
				do {
					z = b[240 + (o << 1) >> 1] | 0;
					B = (N(z, p << 16 >> 16) | 0) + d | 0;
					y = b[f + (n + 1 << 1) >> 1] | 0;
					A = (N(z, y) | 0) + i | 0;
					x = b[240 + (o + 1 << 1) >> 1] | 0;
					y = B + (N(x, y) | 0) | 0;
					B = b[f + (n + 2 << 1) >> 1] | 0;
					A = A + (N(x, B) | 0) | 0;
					w = (N(z, B) | 0) + h | 0;
					v = b[240 + (o + 2 << 1) >> 1] | 0;
					B = y + (N(v, B) | 0) | 0;
					y = b[f + (n + 3 << 1) >> 1] | 0;
					A = A + (N(y, v) | 0) | 0;
					z = (N(y, z) | 0) + g | 0;
					w = w + (N(y, x) | 0) | 0;
					u = b[240 + (o + 3 << 1) >> 1] | 0;
					d = B + (N(u, y) | 0) | 0;
					y = b[f + (n + 4 << 1) >> 1] | 0;
					i = A + (N(u, y) | 0) | 0;
					x = z + (N(y, x) | 0) | 0;
					y = w + (N(y, v) | 0) | 0;
					w = b[f + (n + 5 << 1) >> 1] | 0;
					h = y + (N(w, u) | 0) | 0;
					g = x + (N(w, v) | 0) + (N(b[f + (n + 6 << 1) >> 1] | 0, u) | 0) | 0;
					u = (o << 16) + 262144 | 0;
					o = u >> 16;
					n = o + j | 0;
					p = b[f + (n << 1) >> 1] | 0
				} while ((u | 0) < 1900544);
				z = ((b[f + (q + 30 << 1) >> 1] | 0) * 47 | 0) + i | 0;
				A = ((b[f + (q + 31 << 1) >> 1] | 0) * 47 | 0) + h | 0;
				B = ((b[f + (q + 32 << 1) >> 1] | 0) * 47 | 0) + g | 0;
				b[c >> 1] = (((p << 16 >> 16) * 47 | 0) + d | 0) >>> 15;
				b[k >> 1] = z >>> 15;
				b[l >> 1] = A >>> 15;
				b[m >> 1] = B >>> 15;
				r = r + 1 << 16 >> 16;
				d = r << 16 >> 16;
				if ((t | 0) <= (d | 0)) break;
				else c = c + 8 | 0
			}
			h = f + (s << 1) | 0;
			g = e;
			i = g + 60 | 0;
			do {
				a[g >> 0] = a[h >> 0] | 0;
				g = g + 1 | 0;
				h = h + 1 | 0
			} while ((g | 0) < (i | 0));
			return
		}

		function ya(a, c) {
			a = a | 0;
			c = c | 0;
			var d = 0,
				e = 0;
			d = c;
			e = d + 128 | 0;
			do {
				b[d >> 1] = 0;
				d = d + 2 | 0
			} while ((d | 0) < (e | 0));
			e = a << 16 >> 16;
			b[c + ((e >>> 5 & 62) << 1) >> 1] = ((e & 2048) >>> 1 ^ 1024) + -512 << 16 >> 16;
			b[c + ((e << 1 & 62 | 1) << 1) >> 1] = ((e & 32) << 5 & 65535 ^ 1024) + -512 << 16 >> 16;
			return
		}

		function za(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0;
			n = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			k = n;
			f = d;
			g = f + 128 | 0;
			do {
				b[f >> 1] = 0;
				f = f + 2 | 0
			} while ((f | 0) < (g | 0));
			switch (c << 16 >> 16 | 0) {
				case 20: {
					Aa(b[a >> 1] | 0, 4, 0, k);
					i = b[k >> 1] | 0;
					j = d + ((i << 2 & 60) << 1) | 0;
					b[j >> 1] = (e[j >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
					Aa(b[a + 2 >> 1] | 0, 4, 0, k);
					j = b[k >> 1] | 0;
					i = d + ((j << 2 & 60 | 1) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (j << 6 & 1024 ^ 1024);
					Aa(b[a + 4 >> 1] | 0, 4, 0, k);
					i = b[k >> 1] | 0;
					j = d + ((i << 2 & 60 | 2) << 1) | 0;
					b[j >> 1] = (e[j >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
					Aa(b[a + 6 >> 1] | 0, 4, 0, k);
					a = b[k >> 1] | 0;
					k = d + ((a << 2 & 60 | 3) << 1) | 0;
					b[k >> 1] = (e[k >> 1] | 0) + 65024 + (a << 6 & 1024 ^ 1024);
					l = n;
					return
				}
				case 36: {
					Ba(b[a >> 1] | 0, 4, 0, k);
					h = b[k >> 1] | 0;
					j = d + ((h << 2 & 60) << 1) | 0;
					b[j >> 1] = (e[j >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					j = k + 2 | 0;
					h = b[j >> 1] | 0;
					i = d + ((h << 2 & 60) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					Ba(b[a + 2 >> 1] | 0, 4, 0, k);
					i = b[k >> 1] | 0;
					h = d + ((i << 2 & 60 | 1) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
					h = b[j >> 1] | 0;
					i = d + ((h << 2 & 60 | 1) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					Ba(b[a + 4 >> 1] | 0, 4, 0, k);
					i = b[k >> 1] | 0;
					h = d + ((i << 2 & 60 | 2) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
					h = b[j >> 1] | 0;
					i = d + ((h << 2 & 60 | 2) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					Ba(b[a + 6 >> 1] | 0, 4, 0, k);
					k = b[k >> 1] | 0;
					a = d + ((k << 2 & 60 | 3) << 1) | 0;
					b[a >> 1] = (e[a >> 1] | 0) + 65024 + (k << 6 & 1024 ^ 1024);
					a = b[j >> 1] | 0;
					k = d + ((a << 2 & 60 | 3) << 1) | 0;
					b[k >> 1] = (e[k >> 1] | 0) + 65024 + (a << 6 & 1024 ^ 1024);
					l = n;
					return
				}
				case 44: {
					Ca(b[a >> 1] | 0, 4, 0, k);
					g = b[k >> 1] | 0;
					j = d + ((g << 2 & 60) << 1) | 0;
					b[j >> 1] = (e[j >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					j = k + 2 | 0;
					g = b[j >> 1] | 0;
					h = d + ((g << 2 & 60) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					h = k + 4 | 0;
					g = b[h >> 1] | 0;
					i = d + ((g << 2 & 60) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					Ca(b[a + 2 >> 1] | 0, 4, 0, k);
					i = b[k >> 1] | 0;
					g = d + ((i << 2 & 60 | 1) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
					g = b[j >> 1] | 0;
					i = d + ((g << 2 & 60 | 1) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					h = b[h >> 1] | 0;
					i = d + ((h << 2 & 60 | 1) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					Ba(b[a + 4 >> 1] | 0, 4, 0, k);
					i = b[k >> 1] | 0;
					h = d + ((i << 2 & 60 | 2) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
					h = b[j >> 1] | 0;
					i = d + ((h << 2 & 60 | 2) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					Ba(b[a + 6 >> 1] | 0, 4, 0, k);
					k = b[k >> 1] | 0;
					a = d + ((k << 2 & 60 | 3) << 1) | 0;
					b[a >> 1] = (e[a >> 1] | 0) + 65024 + (k << 6 & 1024 ^ 1024);
					a = b[j >> 1] | 0;
					k = d + ((a << 2 & 60 | 3) << 1) | 0;
					b[k >> 1] = (e[k >> 1] | 0) + 65024 + (a << 6 & 1024 ^ 1024);
					l = n;
					return
				}
				case 52: {
					Ca(b[a >> 1] | 0, 4, 0, k);
					g = b[k >> 1] | 0;
					i = d + ((g << 2 & 60) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					i = k + 2 | 0;
					g = b[i >> 1] | 0;
					j = d + ((g << 2 & 60) << 1) | 0;
					b[j >> 1] = (e[j >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					j = k + 4 | 0;
					g = b[j >> 1] | 0;
					h = d + ((g << 2 & 60) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					Ca(b[a + 2 >> 1] | 0, 4, 0, k);
					h = b[k >> 1] | 0;
					g = d + ((h << 2 & 60 | 1) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					g = b[i >> 1] | 0;
					h = d + ((g << 2 & 60 | 1) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					h = b[j >> 1] | 0;
					g = d + ((h << 2 & 60 | 1) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					Ca(b[a + 4 >> 1] | 0, 4, 0, k);
					g = b[k >> 1] | 0;
					h = d + ((g << 2 & 60 | 2) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					h = b[i >> 1] | 0;
					g = d + ((h << 2 & 60 | 2) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (h << 6 & 1024 ^ 1024);
					g = b[j >> 1] | 0;
					h = d + ((g << 2 & 60 | 2) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					Ca(b[a + 6 >> 1] | 0, 4, 0, k);
					a = b[k >> 1] | 0;
					k = d + ((a << 2 & 60 | 3) << 1) | 0;
					b[k >> 1] = (e[k >> 1] | 0) + 65024 + (a << 6 & 1024 ^ 1024);
					k = b[i >> 1] | 0;
					a = d + ((k << 2 & 60 | 3) << 1) | 0;
					b[a >> 1] = (e[a >> 1] | 0) + 65024 + (k << 6 & 1024 ^ 1024);
					a = b[j >> 1] | 0;
					k = d + ((a << 2 & 60 | 3) << 1) | 0;
					b[k >> 1] = (e[k >> 1] | 0) + 65024 + (a << 6 & 1024 ^ 1024);
					l = n;
					return
				}
				case 64: {
					c = k + 2 | 0;
					f = k + 4 | 0;
					g = k + 6 | 0;
					h = 0;
					do {
						Da((b[a + (h << 1) >> 1] << 14) + (b[a + (h + 4 << 1) >> 1] | 0) | 0, 4, 0, k);
						j = b[k >> 1] | 0;
						i = d + ((j << 2 & 60) + h << 16 >> 16 << 1) | 0;
						b[i >> 1] = (e[i >> 1] | 0) + 65024 + (j << 6 & 1024 ^ 1024);
						i = b[c >> 1] | 0;
						j = d + ((i << 2 & 60) + h << 16 >> 16 << 1) | 0;
						b[j >> 1] = (e[j >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
						j = b[f >> 1] | 0;
						i = d + ((j << 2 & 60) + h << 16 >> 16 << 1) | 0;
						b[i >> 1] = (e[i >> 1] | 0) + 65024 + (j << 6 & 1024 ^ 1024);
						i = b[g >> 1] | 0;
						j = d + ((i << 2 & 60) + h << 16 >> 16 << 1) | 0;
						b[j >> 1] = (e[j >> 1] | 0) + 65024 + (i << 6 & 1024 ^ 1024);
						h = h + 1 | 0
					} while ((h | 0) != 4);
					l = n;
					return
				}
				case 72: {
					Ea((b[a >> 1] << 10) + (b[a + 8 >> 1] | 0) | 0, 4, 0, k);
					c = b[k >> 1] | 0;
					h = d + ((c << 2 & 60) << 1) | 0;
					b[h >> 1] = (e[h >> 1] | 0) + 65024 + (c << 6 & 1024 ^ 1024);
					h = k + 2 | 0;
					c = b[h >> 1] | 0;
					i = d + ((c << 2 & 60) << 1) | 0;
					b[i >> 1] = (e[i >> 1] | 0) + 65024 + (c << 6 & 1024 ^ 1024);
					i = k + 4 | 0;
					c = b[i >> 1] | 0;
					j = d + ((c << 2 & 60) << 1) | 0;
					b[j >> 1] = (e[j >> 1] | 0) + 65024 + (c << 6 & 1024 ^ 1024);
					j = k + 6 | 0;
					c = b[j >> 1] | 0;
					f = d + ((c << 2 & 60) << 1) | 0;
					b[f >> 1] = (e[f >> 1] | 0) + 65024 + (c << 6 & 1024 ^ 1024);
					f = k + 8 | 0;
					c = b[f >> 1] | 0;
					g = d + ((c << 2 & 60) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (c << 6 & 1024 ^ 1024);
					Ea((b[a + 2 >> 1] << 10) + (b[a + 10 >> 1] | 0) | 0, 4, 0, k);
					g = b[k >> 1] | 0;
					c = d + ((g << 2 & 60 | 1) << 1) | 0;
					b[c >> 1] = (e[c >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					c = b[h >> 1] | 0;
					g = d + ((c << 2 & 60 | 1) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (c << 6 & 1024 ^ 1024);
					g = b[i >> 1] | 0;
					c = d + ((g << 2 & 60 | 1) << 1) | 0;
					b[c >> 1] = (e[c >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					c = b[j >> 1] | 0;
					g = d + ((c << 2 & 60 | 1) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (c << 6 & 1024 ^ 1024);
					f = b[f >> 1] | 0;
					g = d + ((f << 2 & 60 | 1) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (f << 6 & 1024 ^ 1024);
					Da((b[a + 4 >> 1] << 14) + (b[a + 12 >> 1] | 0) | 0, 4, 0, k);
					g = b[k >> 1] | 0;
					f = d + ((g << 2 & 60 | 2) << 1) | 0;
					b[f >> 1] = (e[f >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					f = b[h >> 1] | 0;
					g = d + ((f << 2 & 60 | 2) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (f << 6 & 1024 ^ 1024);
					g = b[i >> 1] | 0;
					f = d + ((g << 2 & 60 | 2) << 1) | 0;
					b[f >> 1] = (e[f >> 1] | 0) + 65024 + (g << 6 & 1024 ^ 1024);
					f = b[j >> 1] | 0;
					g = d + ((f << 2 & 60 | 2) << 1) | 0;
					b[g >> 1] = (e[g >> 1] | 0) + 65024 + (f << 6 & 1024 ^ 1024);
					Da((b[a + 6 >> 1] << 14) + (b[a + 14 >> 1] | 0) | 0, 4, 0, k);
					k = b[k >> 1] | 0;
					a = d + ((k << 2 & 60 | 3) << 1) | 0;
					b[a >> 1] = (e[a >> 1] | 0) + 65024 + (k << 6 & 1024 ^ 1024);
					a = b[h >> 1] | 0;
					k = d + ((a << 2 & 60 | 3) << 1) | 0;
					b[k >> 1] = (e[k >> 1] | 0) + 65024 + (a << 6 & 1024 ^ 1024);
					k = b[i >> 1] | 0;
					a = d + ((k << 2 & 60 | 3) << 1) | 0;
					b[a >> 1] = (e[a >> 1] | 0) + 65024 + (k << 6 & 1024 ^ 1024);
					a = b[j >> 1] | 0;
					k = d + ((a << 2 & 60 | 3) << 1) | 0;
					b[k >> 1] = (e[k >> 1] | 0) + 65024 + (a << 6 & 1024 ^ 1024);
					l = n;
					return
				}
				case 88: {
					c = k + 2 | 0;
					f = k + 4 | 0;
					g = k + 6 | 0;
					h = k + 8 | 0;
					i = k + 10 | 0;
					j = 0;
					do {
						Fa((b[a + (j << 1) >> 1] << 11) + (b[a + (j + 4 << 1) >> 1] | 0) | 0, 4, 0, k);
						o = b[k >> 1] | 0;
						p = d + ((o << 2 & 60) + j << 16 >> 16 << 1) | 0;
						b[p >> 1] = (e[p >> 1] | 0) + 65024 + (o << 6 & 1024 ^ 1024);
						p = b[c >> 1] | 0;
						o = d + ((p << 2 & 60) + j << 16 >> 16 << 1) | 0;
						b[o >> 1] = (e[o >> 1] | 0) + 65024 + (p << 6 & 1024 ^ 1024);
						o = b[f >> 1] | 0;
						p = d + ((o << 2 & 60) + j << 16 >> 16 << 1) | 0;
						b[p >> 1] = (e[p >> 1] | 0) + 65024 + (o << 6 & 1024 ^ 1024);
						p = b[g >> 1] | 0;
						o = d + ((p << 2 & 60) + j << 16 >> 16 << 1) | 0;
						b[o >> 1] = (e[o >> 1] | 0) + 65024 + (p << 6 & 1024 ^ 1024);
						o = b[h >> 1] | 0;
						p = d + ((o << 2 & 60) + j << 16 >> 16 << 1) | 0;
						b[p >> 1] = (e[p >> 1] | 0) + 65024 + (o << 6 & 1024 ^ 1024);
						p = b[i >> 1] | 0;
						o = d + ((p << 2 & 60) + j << 16 >> 16 << 1) | 0;
						b[o >> 1] = (e[o >> 1] | 0) + 65024 + (p << 6 & 1024 ^ 1024);
						j = j + 1 | 0
					} while ((j | 0) != 4);
					l = n;
					return
				}
				default: {
					l = n;
					return
				}
			}
		}

		function Aa(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			c = 1 << (c << 16 >> 16);
			d = (c + 65535 & a) + (d & 65535) | 0;
			b[e >> 1] = (c & a | 0) == 0 ? d : d + 16 | 0;
			return
		}

		function Ba(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0;
			i = c << 16 >> 16;
			if (c << 16 >> 16 < 0) f = 1 >>> (0 - i & 15);
			else {
				h = i & 15;
				f = 1 << h;
				f = (f << 16 >> 16 >> h | 0) == 1 ? f : 32767
			}
			h = (f << 16 >> 16) + -1 | 0;
			g = h >> 31;
			g = ((h >> 15 | 0) == (g | 0) ? h : g ^ 32767) << 16 >> 16;
			if (c << 16 >> 16 > -1) f = a >> (i & 31);
			else {
				h = 0 - i & 31;
				f = a << h;
				f = (f >> h | 0) == (a | 0) ? f : a >> 31 ^ 2147483647
			}
			h = f & g;
			c = d << 16 >> 16;
			f = h + c | 0;
			f = (h ^ c | 0) > -1 & (f ^ h | 0) < 0 ? h >> 31 ^ 2147483647 : f;
			h = f & 65535;
			c = ((g & a) << 16 >> 16) + c | 0;
			d = c >> 31;
			d = (c >> 15 | 0) == (d | 0) ? c : d ^ 32767;
			c = d & 65535;
			d = d << 16 >> 16;
			g = f << 16 >> 16;
			f = (1 << (((i << 17 >> 17 | 0) == (i | 0) ? i << 1 : i >>> 15 ^ 32767) << 16 >> 16) & a | 0) != 0;
			if ((g | 0) <= (d | 0)) {
				if (!f) {
					a = h;
					i = c;
					b[e >> 1] = a;
					e = e + 2 | 0;
					b[e >> 1] = i;
					return
				}
				a = g + 16 & 65535;
				i = d + 16 & 65535;
				b[e >> 1] = a;
				e = e + 2 | 0;
				b[e >> 1] = i;
				return
			}
			if (f) {
				a = g + 16 & 65535;
				i = c;
				b[e >> 1] = a;
				e = e + 2 | 0;
				b[e >> 1] = i;
				return
			} else {
				a = h;
				i = d + 16 & 65535;
				b[e >> 1] = a;
				e = e + 2 | 0;
				b[e >> 1] = i;
				return
			}
		}

		function Ca(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0;
			c = c << 16 >> 16;
			g = c << 17;
			f = d & 65535;
			Ba((1 << (c << 1) + -1) + -1 & a, c + 65535 & 65535, (1 << (g + -65536 >> 16) & a | 0) == 0 ? d : (1 <<
				c + -1) + f & 65535, e);
			a = a >> (g >> 16) & (1 << c + 1) + -1;
			c = 1 << c;
			d = (a & c + 65535) + f | 0;
			b[e + 4 >> 1] = (a & c | 0) == 0 ? d : d + 16 | 0;
			return
		}

		function Da(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0;
			i = c << 16 >> 16;
			l = i + 65535 | 0;
			m = l & 65535;
			n = d & 65535;
			f = l << 16;
			o = f >> 16;
			c = 1 << o;
			j = c + n | 0;
			k = j & 65535;
			switch (a >> ((i << 18) + -131072 >> 16) & 3) {
				case 0: {
					c = f >> 15;
					f = l << 17;
					h = 1 << (f + -65536 >> 16);
					g = h + -1 & a;
					h = (h & a | 0) == 0;
					i = 1 << o + -1;
					if (!(1 << (l << 18 >> 16 | 1) & a)) {
						Ba(g, o + 65535 & 65535, h ? d : i + n & 65535, e);
						Ba((1 << (f >> 16 | 1)) + -1 & a >> c, m, d, e + 4 | 0);
						return
					} else {
						Ba(g, o + 65535 & 65535, h ? k : i + j & 65535, e);
						Ba((1 << (f >> 16 | 1)) + -1 & a >> c, m, k, e + 4 | 0);
						return
					}
				}
				case 1: {
					m = a >> ((o * 196608 | 0) + 65536 >> 16);
					d = c + 65535 | 0;
					n = (m & d) + n | 0;
					b[e >> 1] = (m & c | 0) == 0 ? n : n + 16 | 0;
					n = l << 17;
					Ba((1 << (f >> 15) + -1) + -1 & a, o + 65535 & 65535, (1 << (n + -65536 >> 16) & a | 0) == 0 ? k : (
						1 << o + -1) + j & 65535, e + 2 | 0);
					a = (1 << o + 1) + -1 & a >> (n >> 16);
					d = (a & d) + (j & 65535) | 0;
					b[e + 6 >> 1] = (a & c | 0) == 0 ? d : d + 16 | 0;
					return
				}
				case 2: {
					Ba(a >> (l << 17 >> 16 | 1), m, d, e);
					Ba(a, m, k, e + 4 | 0);
					return
				}
				case 3: {
					k = a >> (f + 65536 >> 16);
					m = l << 17;
					Ba((1 << (f >> 15) + -1) + -1 & k, o + 65535 & 65535, (1 << (m + -65536 >> 16) & k | 0) == 0 ? d : (
						1 << o + -1) + n & 65535, e);
					m = k >> (m >> 16) & (1 << o + 1) + -1;
					d = c + 65535 | 0;
					o = (m & d) + n | 0;
					b[e + 4 >> 1] = (m & c | 0) == 0 ? o : o + 16 | 0;
					d = (d & a) + (j & 65535) | 0;
					b[e + 6 >> 1] = (c & a | 0) == 0 ? d : d + 16 | 0;
					return
				}
				default: {}
			}
		}

		function Ea(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0;
			l = c << 16 >> 16;
			h = l + 65535 | 0;
			g = h << 16;
			m = g >> 16;
			if ((h & 65535) << 16 >> 16 < 0) f = 1 >>> (0 - m & 15);
			else {
				k = m & 15;
				f = 1 << k;
				f = (f << 16 >> 16 >> k | 0) == 1 ? f : 32767
			}
			k = (f << 16 >> 16) + (d << 16 >> 16) | 0;
			j = k >> 31;
			j = (k >> 15 | 0) == (j | 0) ? k : j ^ 32767;
			k = a >> (l << 17 >> 16 | 1);
			i = (1 << (g >> 15) + -1) + -1 & k;
			f = h << 17;
			g = (1 << (f + -65536 >> 16) & k | 0) == 0;
			h = 1 << m + -1;
			if (!(1 << ((l * 327680 | 0) + -65536 >> 16) & a)) {
				j = d & 65535;
				Ba(i, m + 65535 & 65535, g ? d : h + j & 65535, e);
				k = (1 << m + 1) + -1 & k >> (f >> 16);
				l = 1 << m;
				m = (k & l + 65535) + j | 0;
				b[e + 4 >> 1] = (k & l | 0) == 0 ? m : m + 16 | 0;
				Ba(a, c, d, e + 6 | 0);
				return
			} else {
				Ba(i, m + 65535 & 65535, j + (g ? 0 : h) & 65535, e);
				k = (1 << m + 1) + -1 & k >> (f >> 16);
				l = 1 << m;
				m = (j & 65535) + (k & l + 65535) | 0;
				b[e + 4 >> 1] = (k & l | 0) == 0 ? m : m + 16 | 0;
				Ba(a, c, d, e + 6 | 0);
				return
			}
		}

		function Fa(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0;
			i = c << 16 >> 16;
			j = i + 65535 | 0;
			k = j & 65535;
			l = d & 65535;
			o = j << 16;
			m = o >> 16;
			n = 1 << m;
			g = n + l | 0;
			h = g & 65535;
			p = i * 6 | 0;
			f = (1 << p + -5 & a | 0) == 0;
			c = f ? d : h;
			f = f ? h : d;
			switch (a >> p + -4 & 3) {
				case 0: {
					Ea(a >> i, k, c, e);
					p = (n + 65535 & a) + (c & 65535) | 0;
					b[e + 10 >> 1] = (n & a | 0) == 0 ? p : p + 16 | 0;
					return
				}
				case 1: {
					Ea(a >> i, k, c, e);
					p = (n + 65535 & a) + (f & 65535) | 0;
					b[e + 10 >> 1] = (n & a | 0) == 0 ? p : p + 16 | 0;
					return
				}
				case 2: {
					Da(a >> (o >> 15 | 1), k, c, e);
					Ba(a, k, f, e + 8 | 0);
					return
				}
				case 3: {
					c = a >> (m * 3 | 0) + 1;
					f = (1 << (o >> 15) + -1) + -1 | 0;
					p = j << 17;
					j = 1 << (p + -65536 >> 16);
					k = 1 << m + -1;
					i = m + 65535 & 65535;
					Ba(f & c, i, (c & j | 0) == 0 ? d : k + l & 65535, e);
					o = (1 << m + 1) + -1 | 0;
					d = p >> 16;
					c = c >> d & o;
					p = n + 65535 | 0;
					m = (c & p) + l | 0;
					b[e + 4 >> 1] = (c & n | 0) == 0 ? m : m + 16 | 0;
					Ba(f & a, i, (j & a | 0) == 0 ? h : k + g & 65535, e + 6 | 0);
					d = o & a >> d;
					p = (d & p) + (g & 65535) | 0;
					b[e + 10 >> 1] = (d & n | 0) == 0 ? p : p + 16 | 0;
					return
				}
				default: {}
			}
		}

		function Ga(c) {
			c = c | 0;
			var d = 0,
				e = 0;
			b[c >> 1] = -14336;
			b[c + 2 >> 1] = -14336;
			b[c + 4 >> 1] = -14336;
			b[c + 6 >> 1] = -14336;
			d = c + 8 | 0;
			e = d + 36 | 0;
			do {
				a[d >> 0] = 0;
				d = d + 1 | 0
			} while ((d | 0) < (e | 0));
			b[c + 44 >> 1] = 21845;
			return
		}

		function Ha(a, d, f, g, h, i, j, k, n, o, p, q) {
			a = a | 0;
			d = d | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			i = i | 0;
			j = j | 0;
			k = k | 0;
			n = n | 0;
			o = o | 0;
			p = p | 0;
			q = q | 0;
			var r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0;
			D = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			u = D + 8 | 0;
			v = D + 6 | 0;
			s = D + 4 | 0;
			y = D;
			z = q + 8 | 0;
			A = q + 10 | 0;
			w = q + 12 | 0;
			B = q + 14 | 0;
			C = q + 24 | 0;
			x = q + 34 | 0;
			c[y >> 2] = yb(f, f, g, u) | 0;
			b[u >> 1] = (e[u >> 1] | 0) + 65512;
			wb(y, u);
			f = c[y >> 2] | 0;
			t = (e[u >> 1] | 0) + 65533 | 0;
			g = t << 16 >> 16;
			if ((t & 65535) << 16 >> 16 > 0) {
				t = f << g;
				t = (t >> g | 0) == (f | 0) ? t : f >> 31 ^ 2147483647
			} else t = f >> (0 - g & 15);
			if (j << 16 >> 16) {
				x = db(q + 18 | 0) | 0;
				x = x << 16 >> 16 < 15565 ? x : 15565;
				b[z >> 1] = x;
				g = o << 16 >> 16 != 0;
				f = n << 16 >> 16;
				x = N(x << 16 >> 16, b[(g ? 300 : 328) + (f << 1) >> 1] | 0) | 0;
				r = x >> 31;
				b[h >> 1] = (x >> 30 | 0) == (r | 0) ? x >>> 15 : r ^ 32767;
				r = db(q + 28 | 0) | 0;
				if (p << 16 >> 16 <= 2) {
					h = N(b[(g ? 314 : 342) + (f << 1) >> 1] | 0, r << 16 >> 16) | 0;
					r = h >> 31;
					r = ((h >> 30 | 0) == (r | 0) ? h >>> 15 : r ^ 32767) & 65535
				}
				b[A >> 1] = r;
				w = q + 4 | 0;
				h = q + 2 | 0;
				v = b[h >> 1] | 0;
				x = b[q >> 1] | 0;
				A = (b[w >> 1] | 0) + (b[q + 6 >> 1] | 0) + (v << 16 >> 16) + (x << 16 >> 16) | 0;
				c[y >> 2] = A;
				b[w >> 1] = v;
				b[h >> 1] = x;
				A = (A >>> 3) + 62464 | 0;
				b[q >> 1] = (A << 16 | 0) < -939524096 ? -14336 : A & 65535;
				A = q + 26 | 0;
				b[C >> 1] = b[A >> 1] | 0;
				y = q + 16 | 0;
				b[B >> 1] = b[y >> 1] | 0;
				C = q + 28 | 0;
				b[A >> 1] = b[C >> 1] | 0;
				A = q + 18 | 0;
				b[y >> 1] = b[A >> 1] | 0;
				B = q + 30 | 0;
				b[C >> 1] = b[B >> 1] | 0;
				C = q + 20 | 0;
				b[A >> 1] = b[C >> 1] | 0;
				b[B >> 1] = b[q + 32 >> 1] | 0;
				b[C >> 1] = b[q + 22 >> 1] | 0;
				b[q + 32 >> 1] = r;
				b[q + 22 >> 1] = b[z >> 1] | 0;
				C = N(t >> 16, r << 16 >> 16) | 0;
				c[i >> 2] = (C | 0) == 1073741824 ? 2147483647 : C << 1;
				l = D;
				return
			}
			n = (b[q >> 1] << 13) + 503316480 | 0;
			o = q + 2 | 0;
			j = b[o >> 1] | 0;
			j = (j * 3277 | 0) == 1073741824 ? 2147483647 : j * 6554 | 0;
			p = j + n | 0;
			p = (j ^ n | 0) > -1 & (p ^ n | 0) < 0 ? n >> 31 ^ 2147483647 : p;
			n = q + 4 | 0;
			j = b[n >> 1] | 0;
			j = (j * 2458 | 0) == 1073741824 ? 2147483647 : j * 4916 | 0;
			g = p + j | 0;
			g = (p ^ j | 0) > -1 & (g ^ p | 0) < 0 ? p >> 31 ^ 2147483647 : g;
			p = q + 6 | 0;
			j = b[p >> 1] | 0;
			j = (j * 1638 | 0) == 1073741824 ? 2147483647 : j * 3276 | 0;
			f = g + j | 0;
			f = (((g ^ j | 0) > -1 & (f ^ g | 0) < 0 ? g >> 31 ^ 2147418112 : f) >> 16) * 5443 >> 7;
			c[y >> 2] = f;
			Ab(f, s, v);
			f = xb(14, b[v >> 1] | 0) | 0;
			g = b[s >> 1] | 0;
			b[s >> 1] = (g & 65535) + 65522;
			j = a << 16 >> 16 << 1;
			j = d << 16 >> 16 == 6 ? 7940 + (j << 1) | 0 : 8196 + (j << 1) | 0;
			b[h >> 1] = b[j >> 1] | 0;
			j = b[j + 2 >> 1] | 0;
			f = N(f << 16 >> 16, j) | 0;
			f = (f | 0) == 1073741824 ? 2147483647 : f << 1;
			c[y >> 2] = f;
			s = (g + -14 & 65535) + 4 | 0;
			g = s << 16 >> 16;
			if ((s & 65535) << 16 >> 16 > 0) {
				s = f << g;
				f = (s >> g | 0) == (f | 0) ? s : f >> 31 ^ 2147483647
			} else f = f >> (0 - g & 15);
			c[y >> 2] = f;
			c[i >> 2] = f;
			if (k << 16 >> 16 == 1 ? (r = b[w >> 1] | 0, r = (r * 5120 | 0) == 1073741824 ? 2147483647 : r * 10240 |
					0, c[y >> 2] = r, (f | 0) > 6553600 & (f | 0) > (r | 0)) : 0) c[i >> 2] = r;
			else r = f;
			k = r << 3;
			k = (k >> 3 | 0) == (r | 0) ? k : r >> 31 ^ 2147483647;
			k = (k | 0) == 2147483647 ? 32767 : (k + 32768 | 0) >>> 16 & 65535;
			b[A >> 1] = k;
			A = b[h >> 1] | 0;
			b[z >> 1] = A;
			b[w >> 1] = k;
			z = b[q + 36 >> 1] | 0;
			h = b[q + 16 >> 1] | 0;
			w = b[q + 26 >> 1] | 0;
			b[C >> 1] = w;
			b[B >> 1] = h;
			b[x >> 1] = z;
			b[q + 26 >> 1] = w;
			b[q + 16 >> 1] = h;
			b[q + 36 >> 1] = z;
			b[q + 32 >> 1] = k;
			b[q + 22 >> 1] = A;
			b[q + 42 >> 1] = A;
			Ab(r, u, v);
			B = t >> 16;
			B = ((N(B, b[v >> 1] | 0) | 0) >> 15) + (N(B, b[u >> 1] | 0) | 0) | 0;
			C = B << 1;
			B = B << 4;
			c[i >> 2] = (B >> 3 | 0) == (C | 0) ? B : C >> 31 ^ 2147483647;
			b[p >> 1] = b[n >> 1] | 0;
			b[n >> 1] = b[o >> 1] | 0;
			b[o >> 1] = b[q >> 1] | 0;
			c[y >> 2] = j;
			zb(j, u, v);
			i = (e[u >> 1] | 0) + 65525 | 0;
			b[u >> 1] = i;
			i = ((b[v >> 1] | 0) * 24660 >> 15) + ((i << 16 >> 16) * 24660 | 0) | 0;
			c[y >> 2] = i << 1;
			b[q >> 1] = i >>> 2;
			l = D;
			return
		}

		function Ia(a, c, d, f, g, h) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			var i = 0,
				j = 0,
				k = 0,
				l = 0;
			j = (b[c >> 1] << 4) + (e[a >> 1] << 16) | 0;
			i = j << 3;
			l = f << 16 >> 16;
			j = ((i >> 3 | 0) == (j | 0) ? i : j >> 31 ^ 2147483647) + (N(b[h >> 1] | 0, l) | 0) | 0;
			f = j << 1;
			j = (f >> 1 | 0) == (j | 0) ? f : j >> 31 ^ 2147483647;
			b[d >> 1] = (j | 0) == 2147483647 ? 32767 : (j + 32768 | 0) >>> 16 & 65535;
			j = (g << 16 >> 16) + -1 | 0;
			f = a + 2 | 0;
			g = c + 2 | 0;
			i = 1;
			while (1) {
				k = i << 16 >> 16;
				g = (b[g >> 1] << 4) + (e[f >> 1] << 16) | 0;
				f = g << 3;
				g = ((f >> 3 | 0) == (g | 0) ? f : g >> 31 ^ 2147483647) + (N(b[d + (k + -1 << 1) >> 1] | 0, l) | 0) |
				0;
				f = g << 1;
				g = (f >> 1 | 0) == (g | 0) ? f : g >> 31 ^ 2147483647;
				b[d + (k << 1) >> 1] = (g | 0) == 2147483647 ? 32767 : (g + 32768 | 0) >>> 16 & 65535;
				if ((j | 0) <= (k | 0)) break;
				g = k + 1 | 0;
				f = a + (g << 1) | 0;
				g = c + (g << 1) | 0;
				i = i + 1 << 16 >> 16
			}
			b[h >> 1] = b[d + (j << 1) >> 1] | 0;
			return
		}

		function Ja(c, d) {
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0;
			if (!c) {
				g = -1;
				return g | 0
			}
			b[c >> 1] = 0;
			b[c + 2 >> 1] = 8192;
			b[c + 4 >> 1] = 3500;
			b[c + 6 >> 1] = 3500;
			b[c + 74 >> 1] = 21845;
			b[c + 348 >> 1] = 0;
			e = c + 10 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			e = c + 42 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			e = c + 76 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 332 >> 1] = 3500;
			e = c + 108 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 334 >> 1] = 3500;
			e = c + 140 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 336 >> 1] = 3500;
			e = c + 172 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 338 >> 1] = 3500;
			e = c + 204 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 340 >> 1] = 3500;
			e = c + 236 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 342 >> 1] = 3500;
			e = c + 268 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 344 >> 1] = 3500;
			e = c + 300 | 0;
			f = d;
			g = e + 32 | 0;
			do {
				a[e >> 0] = a[f >> 0] | 0;
				e = e + 1 | 0;
				f = f + 1 | 0
			} while ((e | 0) < (g | 0));
			b[c + 346 >> 1] = 3500;
			b[c + 350 >> 1] = 7;
			b[c + 352 >> 1] = 32767;
			g = c + 354 | 0;
			b[g >> 1] = 0;
			b[g + 2 >> 1] = 0;
			b[g + 4 >> 1] = 0;
			b[g + 6 >> 1] = 0;
			b[g + 8 >> 1] = 0;
			b[c + 364 >> 1] = 21845;
			b[c + 366 >> 1] = 0;
			g = 0;
			return g | 0
		}

		function Ka(d, f, g, h, i) {
			d = d | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			i = i | 0;
			var j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0,
				E = 0,
				F = 0,
				G = 0,
				H = 0,
				I = 0,
				J = 0,
				K = 0,
				L = 0,
				M = 0,
				O = 0,
				P = 0,
				Q = 0,
				R = 0,
				S = 0,
				T = 0,
				U = 0,
				V = 0,
				X = 0,
				Y = 0,
				Z = 0,
				_ = 0,
				$ = 0,
				aa = 0,
				ba = 0,
				ca = 0,
				da = 0;
			aa = l;
			l = l + 96 | 0;
			if ((l | 0) >= (m | 0)) W(96);
			V = aa + 74 | 0;
			U = aa + 8 | 0;
			X = aa + 4 | 0;
			Y = aa;
			Z = aa + 72 | 0;
			$ = d + 358 | 0;
			_ = d + 354 | 0;
			if (b[$ >> 1] | 0)
				if (!(b[_ >> 1] | 0)) u = 7;
				else {
					j = d + 348 | 0;
					o = b[j >> 1] | 0;
					k = o + 1 | 0;
					k = (k & 65535 | 0) == 8 ? 0 : k << 16 >> 16;
					q = d + 76 + (k << 4 << 1) | 0;
					o = d + 76 + (o << 4 << 1) | 0;
					r = q + 32 | 0;
					do {
						a[q >> 0] = a[o >> 0] | 0;
						q = q + 1 | 0;
						o = o + 1 | 0
					} while ((q | 0) < (r | 0));
					b[d + 332 + (k << 1) >> 1] = b[d + 332 + (b[j >> 1] << 1) >> 1] | 0;
					T = d + 4 | 0;
					b[T >> 1] = 0;
					q = U;
					r = q + 64 | 0;
					do {
						c[q >> 2] = 0;
						q = q + 4 | 0
					} while ((q | 0) < (r | 0));
					x = U + 4 | 0;
					y = U + 8 | 0;
					z = U + 12 | 0;
					A = U + 16 | 0;
					B = U + 20 | 0;
					C = U + 24 | 0;
					D = U + 28 | 0;
					E = U + 32 | 0;
					F = U + 36 | 0;
					G = U + 40 | 0;
					H = U + 44 | 0;
					I = U + 48 | 0;
					J = U + 52 | 0;
					K = U + 56 | 0;
					L = U + 60 | 0;
					j = c[G >> 2] | 0;
					k = c[H >> 2] | 0;
					n = c[I >> 2] | 0;
					o = c[J >> 2] | 0;
					p = c[K >> 2] | 0;
					q = c[L >> 2] | 0;
					r = c[C >> 2] | 0;
					s = c[D >> 2] | 0;
					t = c[E >> 2] | 0;
					u = c[F >> 2] | 0;
					v = 0;
					w = 0;
					M = 0;
					O = 0;
					P = 0;
					Q = 0;
					R = 0;
					S = 0;
					do {
						da = (b[d + 332 + (S << 1) >> 1] | 0) + (M << 16 >> 16) | 0;
						ca = da >> 31;
						b[T >> 1] = (da >> 15 | 0) == (ca | 0) ? da : ca ^ 32767;
						ca = S << 4;
						da = b[d + 76 + (ca << 1) >> 1] | 0;
						ba = O + da | 0;
						O = (O ^ da | 0) > -1 & (ba ^ O | 0) < 0 ? O >> 31 ^ 2147483647 : ba;
						ba = b[d + 76 + ((ca | 1) << 1) >> 1] | 0;
						da = P + ba | 0;
						P = (P ^ ba | 0) > -1 & (da ^ P | 0) < 0 ? P >> 31 ^ 2147483647 : da;
						da = b[d + 76 + ((ca | 2) << 1) >> 1] | 0;
						ba = Q + da | 0;
						Q = (Q ^ da | 0) > -1 & (ba ^ Q | 0) < 0 ? Q >> 31 ^ 2147483647 : ba;
						ba = b[d + 76 + ((ca | 3) << 1) >> 1] | 0;
						da = R + ba | 0;
						R = (R ^ ba | 0) > -1 & (da ^ R | 0) < 0 ? R >> 31 ^ 2147483647 : da;
						da = b[d + 76 + ((ca | 4) << 1) >> 1] | 0;
						ba = v + da | 0;
						v = (v ^ da | 0) > -1 & (ba ^ v | 0) < 0 ? v >> 31 ^ 2147483647 : ba;
						ba = b[d + 76 + ((ca | 5) << 1) >> 1] | 0;
						da = w + ba | 0;
						w = (w ^ ba | 0) > -1 & (da ^ w | 0) < 0 ? w >> 31 ^ 2147483647 : da;
						da = b[d + 76 + ((ca | 6) << 1) >> 1] | 0;
						ba = r + da | 0;
						r = (r ^ da | 0) > -1 & (ba ^ r | 0) < 0 ? r >> 31 ^ 2147483647 : ba;
						ba = b[d + 76 + ((ca | 7) << 1) >> 1] | 0;
						da = s + ba | 0;
						s = (s ^ ba | 0) > -1 & (da ^ s | 0) < 0 ? s >> 31 ^ 2147483647 : da;
						da = b[d + 76 + ((ca | 8) << 1) >> 1] | 0;
						ba = t + da | 0;
						t = (t ^ da | 0) > -1 & (ba ^ t | 0) < 0 ? t >> 31 ^ 2147483647 : ba;
						ba = b[d + 76 + ((ca | 9) << 1) >> 1] | 0;
						da = u + ba | 0;
						u = (u ^ ba | 0) > -1 & (da ^ u | 0) < 0 ? u >> 31 ^ 2147483647 : da;
						da = b[d + 76 + ((ca | 10) << 1) >> 1] | 0;
						ba = j + da | 0;
						j = (j ^ da | 0) > -1 & (ba ^ j | 0) < 0 ? j >> 31 ^ 2147483647 : ba;
						ba = b[d + 76 + ((ca | 11) << 1) >> 1] | 0;
						da = k + ba | 0;
						k = (k ^ ba | 0) > -1 & (da ^ k | 0) < 0 ? k >> 31 ^ 2147483647 : da;
						da = b[d + 76 + ((ca | 12) << 1) >> 1] | 0;
						ba = n + da | 0;
						n = (n ^ da | 0) > -1 & (ba ^ n | 0) < 0 ? n >> 31 ^ 2147483647 : ba;
						ba = b[d + 76 + ((ca | 13) << 1) >> 1] | 0;
						da = o + ba | 0;
						o = (o ^ ba | 0) > -1 & (da ^ o | 0) < 0 ? o >> 31 ^ 2147483647 : da;
						da = b[d + 76 + ((ca | 14) << 1) >> 1] | 0;
						ba = p + da | 0;
						p = (p ^ da | 0) > -1 & (ba ^ p | 0) < 0 ? p >> 31 ^ 2147483647 : ba;
						ca = b[d + 76 + ((ca | 15) << 1) >> 1] | 0;
						ba = q + ca | 0;
						q = (q ^ ca | 0) > -1 & (ba ^ q | 0) < 0 ? q >> 31 ^ 2147483647 : ba;
						S = S + 1 | 0;
						M = b[T >> 1] | 0
					} while ((S | 0) != 8);
					c[U >> 2] = O;
					c[x >> 2] = P;
					c[y >> 2] = Q;
					c[z >> 2] = R;
					c[A >> 2] = v;
					c[B >> 2] = w;
					c[C >> 2] = r;
					c[D >> 2] = s;
					c[E >> 2] = t;
					c[F >> 2] = u;
					c[G >> 2] = j;
					c[H >> 2] = k;
					c[I >> 2] = n;
					c[J >> 2] = o;
					c[K >> 2] = p;
					c[L >> 2] = q;
					u = M << 16 >> 16 >> 1;
					b[T >> 1] = u << 16 >> 16 < -1024 ? 0 : u + 1024 << 16 >> 16;
					b[d + 10 >> 1] = (c[U >> 2] | 0) >>> 3;
					b[d + 12 >> 1] = (c[x >> 2] | 0) >>> 3;
					b[d + 14 >> 1] = (c[y >> 2] | 0) >>> 3;
					b[d + 16 >> 1] = (c[z >> 2] | 0) >>> 3;
					b[d + 18 >> 1] = (c[A >> 2] | 0) >>> 3;
					b[d + 20 >> 1] = (c[B >> 2] | 0) >>> 3;
					b[d + 22 >> 1] = (c[C >> 2] | 0) >>> 3;
					b[d + 24 >> 1] = (c[D >> 2] | 0) >>> 3;
					b[d + 26 >> 1] = (c[E >> 2] | 0) >>> 3;
					b[d + 28 >> 1] = (c[F >> 2] | 0) >>> 3;
					b[d + 30 >> 1] = j >>> 3;
					b[d + 32 >> 1] = k >>> 3;
					b[d + 34 >> 1] = n >>> 3;
					b[d + 36 >> 1] = o >>> 3;
					b[d + 38 >> 1] = p >>> 3;
					b[d + 40 >> 1] = q >>> 3;
					u = 6
				}
			else u = 6;
			if ((u | 0) == 6)
				if (b[_ >> 1] | 0) {
					n = d + 42 | 0;
					k = d + 10 | 0;
					q = n;
					o = k;
					r = q + 32 | 0;
					do {
						a[q >> 0] = a[o >> 0] | 0;
						q = q + 1 | 0;
						o = o + 1 | 0
					} while ((q | 0) < (r | 0));
					t = d + 4 | 0;
					j = b[t >> 1] | 0;
					s = d + 6 | 0;
					b[s >> 1] = j;
					p = d + 356 | 0;
					do
						if (b[p >> 1] | 0) {
							j = b[d >> 1] | 0;
							j = j << 16 >> 16 < 32 ? j : 32;
							if (j << 16 >> 16 > 1) {
								j = j << 16 >> 16;
								j = ub(1024, ((j << 26 >> 26 | 0) == (j | 0) ? j << 10 : j >>> 15 ^ 32767) & 65535) | 0
							} else j = 16384;
							b[d + 2 >> 1] = j;
							b[V >> 1] = Oa(6, i) | 0;
							b[V + 2 >> 1] = Oa(6, i) | 0;
							b[V + 4 >> 1] = Oa(6, i) | 0;
							b[V + 6 >> 1] = Oa(5, i) | 0;
							b[V + 8 >> 1] = Oa(5, i) | 0;
							Cb(V, k);
							da = Oa(6, i) | 0;
							b[d + 366 >> 1] = Pa(i) | 0;
							da = da << 16 >> 16;
							da = (((da << 25 >> 25 | 0) == (da | 0) ? da << 9 : da >>> 15 ^ 32767) << 16 >> 16) * 12483 | 0;
							j = da >> 31;
							j = ((da >> 30 | 0) == (j | 0) ? da >>> 15 : j ^ 32767) & 65535;
							b[t >> 1] = j;
							if (b[d + 362 >> 1] | 0 ? b[d + 360 >> 1] | 0 : 0) break;
							q = n;
							o = k;
							r = q + 32 | 0;
							do {
								a[q >> 0] = a[o >> 0] | 0;
								q = q + 1 | 0;
								o = o + 1 | 0
							} while ((q | 0) < (r | 0));
							b[s >> 1] = j
						} while (0);
					if ((b[_ >> 1] | 0) != 0 ? (b[p >> 1] | 0) != 0 : 0) b[d >> 1] = 0
				} else u = 7;
			if ((u | 0) == 7) {
				j = d + 4 | 0;
				k = d + 10 | 0;
				s = d + 6 | 0;
				t = j;
				j = b[j >> 1] | 0
			}
			n = b[d >> 1] | 0;
			p = d + 2 | 0;
			n = N(((n << 26 >> 26 | 0) == (n | 0) ? n << 10 : n >>> 15 ^ 32767) << 16 >> 16, b[p >> 1] | 0) | 0;
			da = n >> 31;
			da = (n >> 30 | 0) == (da | 0) ? n >>> 15 : da ^ 32767;
			da = (da & 65535) << 16 >> 16 < 1024 ? da << 16 >> 16 : 1024;
			da = (da << 20 >> 20 | 0) == (da | 0) ? da << 4 : da >>> 15 ^ 32767;
			n = da << 16 >> 16;
			j = N(n, j << 16 >> 16) | 0;
			c[X >> 2] = (j | 0) == 1073741824 ? 2147483647 : j << 1;
			j = N(n, b[k >> 1] | 0) | 0;
			k = j >> 31;
			b[h >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 12 >> 1] | 0) | 0;
			j = k >> 31;
			b[h + 2 >> 1] = (k >> 30 | 0) == (j | 0) ? k >>> 15 : j ^ 32767;
			j = N(n, b[d + 14 >> 1] | 0) | 0;
			k = j >> 31;
			b[h + 4 >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 16 >> 1] | 0) | 0;
			j = k >> 31;
			b[h + 6 >> 1] = (k >> 30 | 0) == (j | 0) ? k >>> 15 : j ^ 32767;
			j = N(n, b[d + 18 >> 1] | 0) | 0;
			k = j >> 31;
			b[h + 8 >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 20 >> 1] | 0) | 0;
			j = k >> 31;
			b[h + 10 >> 1] = (k >> 30 | 0) == (j | 0) ? k >>> 15 : j ^ 32767;
			j = N(n, b[d + 22 >> 1] | 0) | 0;
			k = j >> 31;
			b[h + 12 >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 24 >> 1] | 0) | 0;
			j = k >> 31;
			b[h + 14 >> 1] = (k >> 30 | 0) == (j | 0) ? k >>> 15 : j ^ 32767;
			j = N(n, b[d + 26 >> 1] | 0) | 0;
			k = j >> 31;
			b[h + 16 >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 28 >> 1] | 0) | 0;
			j = k >> 31;
			b[h + 18 >> 1] = (k >> 30 | 0) == (j | 0) ? k >>> 15 : j ^ 32767;
			j = N(n, b[d + 30 >> 1] | 0) | 0;
			k = j >> 31;
			b[h + 20 >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 32 >> 1] | 0) | 0;
			j = k >> 31;
			b[h + 22 >> 1] = (k >> 30 | 0) == (j | 0) ? k >>> 15 : j ^ 32767;
			j = N(n, b[d + 34 >> 1] | 0) | 0;
			k = j >> 31;
			b[h + 24 >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 36 >> 1] | 0) | 0;
			j = k >> 31;
			b[h + 26 >> 1] = (k >> 30 | 0) == (j | 0) ? k >>> 15 : j ^ 32767;
			j = N(n, b[d + 38 >> 1] | 0) | 0;
			k = j >> 31;
			b[h + 28 >> 1] = (j >> 30 | 0) == (k | 0) ? j >>> 15 : k ^ 32767;
			k = N(n, b[d + 40 >> 1] | 0) | 0;
			n = k >> 31;
			b[h + 30 >> 1] = (k >> 30 | 0) == (n | 0) ? k >>> 15 : n ^ 32767;
			n = c[X >> 2] | 0;
			k = 16384 - da << 16 >> 16;
			da = N(k, b[s >> 1] | 0) | 0;
			da = (da | 0) == 1073741824 ? 2147483647 : da << 1;
			j = da + n | 0;
			j = (da ^ n | 0) > -1 & (j ^ n | 0) < 0 ? n >> 31 ^ 2147483647 : j;
			c[X >> 2] = j;
			n = 0;
			do {
				da = h + (n << 1) | 0;
				ba = N(k, b[d + 42 + (n << 1) >> 1] | 0) | 0;
				ca = ba >> 31;
				ca = (((ba >> 30 | 0) == (ca | 0) ? ba >>> 15 : ca ^ 32767) << 16 >> 16) + (b[da >> 1] | 0) | 0;
				ba = ca >> 31;
				ba = (ca >> 15 | 0) == (ba | 0) ? ca : ba ^ 32767;
				ca = ba << 16;
				b[da >> 1] = (ba << 17 >> 17 | 0) == (ca >> 16 | 0) ? ba << 1 : ca >> 31 ^ 32767;
				n = n + 1 | 0
			} while ((n | 0) != 16);
			if (b[d + 366 >> 1] | 0) {
				La(h, X, d + 364 | 0);
				j = c[X >> 2] | 0
			}
			n = j >> 9;
			c[X >> 2] = n;
			da = j >> 25;
			o = da << 16;
			k = n - o | 0;
			j = xb(da + 15 & 65535, (((k ^ n) & (o ^ n) | 0) < 0 ? j >> 31 ^ 131070 : k) >>> 1 & 65535) | 0;
			k = (gb(j) | 0) << 16 >> 16;
			n = d + 74 | 0;
			o = 0;
			do {
				b[f + (o << 1) >> 1] = (fb(n) | 0) << 16 >> 16 >> 4;
				o = o + 1 | 0
			} while ((o | 0) != 256);
			c[Y >> 2] = yb(f, f, 256, Z) | 0;
			wb(Y, Z);
			ca = N(c[Y >> 2] >> 16, j << k >> 16) | 0;
			o = ca >> 31;
			n = 19 - k + (e[Z >> 1] | 0) | 0;
			da = n & 65535;
			b[Z >> 1] = da;
			o = ((ca >> 30 | 0) == (o | 0) ? ca >>> 15 : o ^ 32767) << 16 >> 16;
			n = n << 16 >> 16;
			k = 0 - n & 15;
			n = n & 15;
			if (da << 16 >> 16 < 0) {
				j = 0;
				do {
					da = f + (j << 1) | 0;
					ba = N(o, b[da >> 1] | 0) | 0;
					ca = ba >> 31;
					b[da >> 1] = ((ba >> 30 | 0) == (ca | 0) ? ba >>> 15 : ca ^ 32767) << 16 >> 16 >> k;
					j = j + 1 | 0
				} while ((j | 0) != 256)
			} else {
				j = 0;
				do {
					da = f + (j << 1) | 0;
					Z = N(o, b[da >> 1] | 0) | 0;
					ca = Z >> 31;
					ca = ((Z >> 30 | 0) == (ca | 0) ? Z >>> 15 : ca ^ 32767) << 16;
					Z = ca >> 16;
					ba = Z << n;
					b[da >> 1] = (ba << 16 >> 16 >> n | 0) == (Z | 0) ? ba : ca >> 31 ^ 32767;
					j = j + 1 | 0
				} while ((j | 0) != 256)
			}
			if (g << 16 >> 16 == 2) {
				da = b[d >> 1] | 0;
				da = (da << 16 >> 16 < 32 ? da : 32) << 16 >> 16;
				b[p >> 1] = ub(1024, ((da << 26 >> 26 | 0) == (da | 0) ? da << 10 : da >>> 15 ^ 32767) & 65535) | 0;
				b[d >> 1] = 0;
				da = b[t >> 1] | 0;
				b[s >> 1] = da;
				b[t >> 1] = (da & 65535) + 65472
			}
			if (!(b[_ >> 1] | 0)) {
				l = aa;
				return 0
			}
			if ((b[d + 356 >> 1] | 0) == 0 ? (b[$ >> 1] | 0) == 0 : 0) {
				l = aa;
				return 0
			}
			b[d >> 1] = 0;
			b[d + 362 >> 1] = 1;
			l = aa;
			return 0
		}

		function La(a, d, e) {
			a = a | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0;
			h = (fb(e) | 0) << 16 >> 16 >> 1;
			h = ((fb(e) | 0) << 16 >> 16 >> 1) + h << 16 >> 16;
			g = c[d >> 2] | 0;
			h = h << 16 >> 16;
			h = (h * 75 | 0) == 1073741824 ? 2147483647 : h * 150 | 0;
			f = h + g | 0;
			f = (h ^ g | 0) > -1 & (f ^ g | 0) < 0 ? g >> 31 ^ 2147483647 : f;
			c[d >> 2] = (f | 0) > 0 ? f : 0;
			d = (fb(e) | 0) << 16 >> 16 >> 1;
			d = ((fb(e) | 0) << 16 >> 16 >> 1) + d << 16 >> 16;
			f = b[a >> 1] | 0;
			f = ((sb(d, 256) | 0) << 16 >> 16) + (f << 16 >> 16) | 0;
			d = f >> 31;
			d = ((f >> 15 | 0) == (d | 0) ? f : d ^ 32767) & 65535;
			b[a >> 1] = d << 16 >> 16 > 128 ? d : 128;
			d = 256;
			f = 1;
			do {
				h = (d << 16 >> 16) + 2 | 0;
				g = h >> 31;
				d = (h >> 15 | 0) == (g | 0) ? h : g ^ 32767;
				g = (fb(e) | 0) << 16 >> 16 >> 1;
				g = ((fb(e) | 0) << 16 >> 16 >> 1) + g << 16 >> 16;
				h = a + (f << 1) | 0;
				i = b[h >> 1] | 0;
				i = ((sb(g, d & 65535) | 0) << 16 >> 16) + (i << 16 >> 16) | 0;
				g = i >> 31;
				g = (i >> 15 | 0) == (g | 0) ? i : g ^ 32767;
				i = b[a + (f + -1 << 1) >> 1] | 0;
				k = (g << 16 >> 16) - (i << 16 >> 16) | 0;
				j = k >> 31;
				b[h >> 1] = (((k >> 15 | 0) == (j | 0) ? k : j ^ 32767) & 65535) << 16 >> 16 < 448 ? (i & 65535) + 448 |
					0 : g;
				f = f + 1 | 0
			} while ((f | 0) != 15);
			d = a + 28 | 0;
			if ((b[d >> 1] | 0) <= 16384) return;
			b[d >> 1] = 16384;
			return
		}

		function Ma(c, d, e) {
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0;
			k = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			h = k + 2 | 0;
			i = k;
			j = c + 348 | 0;
			g = (b[j >> 1] | 0) + 1 << 16 >> 16;
			g = g << 16 >> 16 == 8 ? 0 : g;
			b[j >> 1] = g;
			g = c + 76 + (g << 16 >> 16 << 4 << 1) | 0;
			f = g + 32 | 0;
			do {
				a[g >> 0] = a[d >> 0] | 0;
				g = g + 1 | 0;
				d = d + 1 | 0
			} while ((g | 0) < (f | 0));
			d = 0;
			f = 0;
			do {
				n = b[e + (f << 1) >> 1] | 0;
				n = N(n, n) | 0;
				n = (n | 0) == 1073741824 ? 2147483647 : n << 1;
				g = n + d | 0;
				d = (n ^ d | 0) > -1 & (g ^ d | 0) < 0 ? d >> 31 ^ 2147483647 : g;
				f = f + 1 | 0
			} while ((f | 0) != 256);
			zb(d >> 1, h, i);
			n = b[h >> 1] | 0;
			b[c + 332 + (b[j >> 1] << 1) >> 1] = ((b[i >> 1] | 0) >>> 8) + 64512 + ((n << 23 >> 23 | 0) == (n | 0) ?
				n << 7 : n >>> 15 ^ 32767);
			l = k;
			return
		}

		function Na(a, c) {
			a = a | 0;
			c = c | 0;
			var d = 0,
				e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0;
			i = c + -4 << 16 >> 16;
			d = b[a + 360 >> 1] | 0;
			a: do
				if ((i & 65535) < 3) f = 4;
				else {
					if ((d + -1 & 65535) < 2) switch (c << 16 >> 16) {
						case 2:
						case 3:
						case 7: {
							f = 4;
							break a
						}
						default: {}
					}
					d = 0;
					e = a;
					f = 10
				}
			while (0);
			if ((f | 0) == 4) {
				b: do
					if (d << 16 >> 16 == 2) {
						switch (c << 16 >> 16) {
							case 2:
							case 4:
							case 6:
							case 7:
								break;
							default: {
								d = 1;
								break b
							}
						}
						d = 2
					} else d = 1; while (0);g = (b[a >> 1] | 0) + 1 | 0;h = g >> 31;h = ((g >> 15 | 0) == (h | 0) ? g :
					h ^ 32767) & 65535;b[a >> 1] = h;d = h << 16 >> 16 > 50 ? 2 : d;
				if (c << 16 >> 16 == 5 & (b[a + 362 >> 1] | 0) == 0) {
					e = a + 352 | 0;
					f = 10
				}
			}
			if ((f | 0) == 10) b[e >> 1] = 0;
			g = a + 352 | 0;
			h = (b[g >> 1] | 0) + 1 | 0;
			e = h >> 31;
			e = ((h >> 15 | 0) == (e | 0) ? h : e ^ 32767) & 65535;
			b[g >> 1] = e;
			h = a + 358 | 0;
			b[h >> 1] = 0;
			do
				if ((i & 65535) < 4) {
					if (e << 16 >> 16 > 30) {
						b[h >> 1] = 1;
						b[g >> 1] = 0;
						b[a + 350 >> 1] = 0;
						break
					}
					e = a + 350 | 0;
					f = b[e >> 1] | 0;
					if (!(f << 16 >> 16)) {
						b[g >> 1] = 0;
						break
					} else {
						b[e >> 1] = f + -1 << 16 >> 16;
						break
					}
				} else b[a + 350 >> 1] = 7; while (0);
			if (!(d << 16 >> 16)) return d | 0;
			f = a + 354 | 0;
			b[f >> 1] = 0;
			e = a + 356 | 0;
			b[e >> 1] = 0;
			switch (c << 16 >> 16) {
				case 4: {
					b[f >> 1] = 1;
					return d | 0
				}
				case 5: {
					b[f >> 1] = 1;
					b[e >> 1] = 1;
					return d | 0
				}
				case 6: {
					b[f >> 1] = 1;
					b[h >> 1] = 0;
					return d | 0
				}
				default:
					return d | 0
			}
			return 0
		}

		function Oa(a, d) {
			a = a | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0;
			e = a << 16 >> 16 >> 1;
			if (!(e << 16 >> 16)) e = 0;
			else {
				h = c[d >> 2] | 0;
				i = ((e + -1 & 65535) << 1) + 2 | 0;
				g = 0;
				f = h;
				while (1) {
					j = g << 16 >> 14;
					g = ((b[f >> 1] | 0) == 127 ? j | 2 : j) | (b[f + 2 >> 1] | 0) == 127;
					e = e + -1 << 16 >> 16;
					if (!(e << 16 >> 16)) break;
					else f = f + 4 | 0
				}
				c[d >> 2] = h + (i << 1);
				e = g & 65535
			}
			if (!(a & 1)) {
				j = e;
				return j | 0
			}
			e = e << 16 >> 16 << 1;
			j = c[d >> 2] | 0;
			c[d >> 2] = j + 2;
			if ((b[j >> 1] | 0) != 127) {
				j = e & 65535;
				return j | 0
			}
			j = (e | 1) & 65535;
			return j | 0
		}

		function Pa(a) {
			a = a | 0;
			var d = 0;
			d = c[a >> 2] | 0;
			c[a >> 2] = d + 2;
			return (b[d >> 1] | 0) == 127 | 0
		}

		function Qa(b) {
			b = b | 0;
			var c = 0;
			c = b + 12 | 0;
			do {
				a[b >> 0] = 0;
				b = b + 1 | 0
			} while ((b | 0) < (c | 0));
			return
		}

		function Ra(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0;
			f = b[d >> 1] | 0;
			o = d + 2 | 0;
			j = b[o >> 1] | 0;
			p = d + 4 | 0;
			i = b[p >> 1] | 0;
			q = d + 6 | 0;
			e = b[q >> 1] | 0;
			m = d + 8 | 0;
			h = b[m >> 1] | 0;
			n = d + 10 | 0;
			g = b[n >> 1] | 0;
			if (c << 16 >> 16 <= 0) {
				a = g;
				l = h;
				k = e;
				b[d >> 1] = f;
				b[o >> 1] = j;
				b[p >> 1] = i;
				b[q >> 1] = k;
				b[m >> 1] = l;
				b[n >> 1] = a;
				return
			}
			l = c & 65535;
			k = g;
			c = j;
			j = 0;
			while (1) {
				r = (N(c << 16 >> 16, -14160) | 0) + 8192 + ((e << 16 >> 16) * 29280 | 0) | 0;
				f = N(f << 16 >> 16, -14160) | 0;
				c = a + (j << 1) | 0;
				g = b[c >> 1] | 0;
				f = ((N(h << 16 >> 16, -1830) | 0) + ((i << 16 >> 16) * 29280 | 0) + f + (((g << 16 >> 16) + (k << 16 >>
					16) | 0) * 915 | 0) << 2) + (r >> 13) | 0;
				b[c >> 1] = (f + 32768 | 0) >>> 16;
				c = f >>> 16 & 65535;
				f = f >>> 1 & 32767;
				j = j + 1 | 0;
				if ((j | 0) == (l | 0)) break;
				else {
					s = e;
					k = h;
					r = i;
					h = g;
					e = f;
					i = c;
					c = s;
					f = r
				}
			}
			b[d >> 1] = i;
			b[o >> 1] = e;
			b[p >> 1] = c;
			b[q >> 1] = f;
			b[m >> 1] = g;
			b[n >> 1] = h;
			return
		}

		function Sa(b) {
			b = b | 0;
			var c = 0;
			c = b + 12 | 0;
			do {
				a[b >> 0] = 0;
				b = b + 1 | 0
			} while ((b | 0) < (c | 0));
			return
		}

		function Ta(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0;
			f = b[d >> 1] | 0;
			o = d + 2 | 0;
			k = b[o >> 1] | 0;
			p = d + 4 | 0;
			i = b[p >> 1] | 0;
			q = d + 6 | 0;
			e = b[q >> 1] | 0;
			m = d + 8 | 0;
			h = b[m >> 1] | 0;
			n = d + 10 | 0;
			g = b[n >> 1] | 0;
			if (!(c << 16 >> 16)) {
				l = g;
				j = h;
				a = e;
				b[d >> 1] = f;
				b[o >> 1] = k;
				b[p >> 1] = i;
				b[q >> 1] = a;
				b[m >> 1] = j;
				b[n >> 1] = l;
				return
			} else {
				l = c;
				j = g;
				c = k
			}
			while (1) {
				k = (N(c << 16 >> 16, -8021) | 0) + 8192 + ((e << 16 >> 16) * 16211 | 0) | 0;
				f = N(f << 16 >> 16, -16042) | 0;
				g = b[a >> 1] | 0;
				j = (N(h << 16 >> 16, -16212) | 0) + ((i << 16 >> 16) * 32422 | 0) + f + (k >> 14) + (((g << 16 >> 16) +
					(j << 16 >> 16) | 0) * 8106 | 0) | 0;
				k = j << 2;
				f = j >>> 14;
				c = f & 65535;
				f = (k - (f << 16) | 0) >>> 1 & 65535;
				b[a >> 1] = (j << 3 >> 1 | 0) == (k | 0) ? (k + 16384 | 0) >>> 15 : k >> 31 ^ 32767;
				l = l + -1 << 16 >> 16;
				if (!(l << 16 >> 16)) break;
				else {
					r = e;
					j = h;
					k = i;
					h = g;
					e = f;
					i = c;
					a = a + 2 | 0;
					c = r;
					f = k
				}
			}
			b[d >> 1] = i;
			b[o >> 1] = e;
			b[p >> 1] = c;
			b[q >> 1] = f;
			b[m >> 1] = g;
			b[n >> 1] = h;
			return
		}

		function Ua(a, d, e) {
			a = a | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0;
			n = l;
			l = l + 80 | 0;
			if ((l | 0) >= (m | 0)) W(80);
			k = n + 8 | 0;
			i = n;
			c[i >> 2] = a;
			switch (d | 0) {
				case 8: {
					b[k >> 1] = Oa(15, i) | 0;
					b[k + 2 >> 1] = Oa(15, i) | 0;
					b[k + 4 >> 1] = Oa(15, i) | 0;
					b[k + 6 >> 1] = Oa(15, i) | 0;
					b[k + 8 >> 1] = Oa(15, i) | 0;
					b[k + 10 >> 1] = Oa(15, i) | 0;
					b[k + 12 >> 1] = Oa(15, i) | 0;
					b[k + 14 >> 1] = Oa(15, i) | 0;
					b[k + 16 >> 1] = Oa(15, i) | 0;
					b[k + 18 >> 1] = Oa(15, i) | 0;
					b[k + 20 >> 1] = (Oa(15, i) | 0) & 25087;
					b[k + 22 >> 1] = Oa(15, i) | 0;
					b[k + 24 >> 1] = Oa(15, i) | 0;
					b[k + 26 >> 1] = Oa(15, i) | 0;
					b[k + 28 >> 1] = Oa(15, i) | 0;
					b[k + 30 >> 1] = Oa(15, i) | 0;
					b[k + 32 >> 1] = Oa(15, i) | 0;
					b[k + 34 >> 1] = (Oa(15, i) | 0) & -7937;
					b[k + 36 >> 1] = Oa(15, i) | 0;
					b[k + 38 >> 1] = Oa(15, i) | 0;
					b[k + 40 >> 1] = Oa(15, i) | 0;
					b[k + 42 >> 1] = Oa(15, i) | 0;
					b[k + 44 >> 1] = Oa(15, i) | 0;
					b[k + 46 >> 1] = Oa(15, i) | 0;
					b[k + 48 >> 1] = (Oa(15, i) | 0) & 32527;
					b[k + 50 >> 1] = Oa(15, i) | 0;
					b[k + 52 >> 1] = Oa(15, i) | 0;
					b[k + 54 >> 1] = Oa(15, i) | 0;
					b[k + 56 >> 1] = Oa(15, i) | 0;
					b[k + 58 >> 1] = Oa(15, i) | 0;
					b[k + 60 >> 1] = Oa(15, i) | 0;
					i = (Oa(8, i) | 0) << 16 >> 16;
					b[k + 62 >> 1] = (i << 23 >> 23 | 0) == (i | 0) ? i << 7 : i >>> 15 ^ 32767;
					i = 0;
					h = 31;
					j = 9;
					break
				}
				case 9: {
					k = 0;
					l = n;
					return k | 0
				}
				default: {
					g = e << 16 >> 16;
					h = (g << 16) + -983040 | 0;
					f = h >> 16;
					if ((h | 0) > 0) {
						e = 0;
						a = 0;
						do {
							b[k + (e << 16 >> 16 << 1) >> 1] = Oa(15, i) | 0;
							e = e + 1 << 16 >> 16;
							a = (a << 16) + 983040 >> 16
						} while ((f | 0) > (a | 0));
						h = e
					} else {
						h = 0;
						a = 0
					}
					e = g - a | 0;
					a = Oa(e & 65535, i) | 0;
					f = k + (h << 16 >> 16 << 1) | 0;
					b[f >> 1] = a;
					e = 15 - e | 0;
					g = e & 65535;
					e = e << 16 >> 16;
					if (g << 16 >> 16 < 0) a = a << 16 >> 16 >> (0 - e & 15);
					else {
						e = e & 15;
						a = a << 16 >> 16;
						i = a << e;
						a = (i << 16 >> 16 >> e | 0) == (a | 0) ? i : a >> 15 ^ 32767
					}
					b[f >> 1] = a;
					if (h << 16 >> 16 > 0) {
						i = g;
						j = 9
					} else {
						h = g;
						g = 0;
						f = 0
					}
				}
			}
			a: do
				if ((j | 0) == 9) {
					e = c[8 + (d << 2) >> 2] | 0;
					a = 0;
					f = 0;
					while (1) {
						g = b[e + (f << 1) >> 1] ^ b[k + (f << 1) >> 1];
						a = a + 1 << 16 >> 16;
						if (g << 16 >> 16) {
							h = i;
							break a
						}
						f = a << 16 >> 16;
						if (a << 16 >> 16 >= h << 16 >> 16) {
							h = i;
							g = 0;
							break
						}
					}
				}
			while (0);
			a = h << 16 >> 16;
			e = 32767 >>> a;
			if (h << 16 >> 16 < 0) a = e << 16 >> 16 >> (0 - a & 15);
			else {
				h = a & 15;
				a = e << 16;
				i = a >> 16;
				j = i << h;
				a = (j << 16 >> 16 >> h | 0) == (i | 0) ? j : a >> 31 ^ 32767
			}
			k = (b[(c[8 + (d << 2) >> 2] | 0) + (f << 1) >> 1] & (a & 65535) ^ b[k + (f << 1) >> 1] | g) << 16 >>
				16 == 0 & 1;
			l = n;
			return k | 0
		}

		function Va(a, c) {
			a = a | 0;
			c = c | 0;
			c = c << 16 >> 16;
			return Ua(a, c, b[7682 + (c << 1) >> 1] | 0) | 0
		}

		function Wa(a, c) {
			a = a | 0;
			c = c | 0;
			c = c << 16 >> 16;
			return Ua(a, c, b[746 + (c << 1) >> 1] | 0) | 0
		}

		function Xa(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0;
			k = l;
			l = l + 32 | 0;
			if ((l | 0) >= (m | 0)) W(32);
			j = k;
			g = b[d >> 1] | 0;
			f = 32767 - g | 0;
			h = f >> 31;
			h = (((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) << 16 >> 16) + 1 | 0;
			f = h >> 31;
			f = ((h >> 15 | 0) == (f | 0) ? h : f ^ 32767) << 16 >> 16;
			h = 0;
			do {
				n = N(f, b[a + (h << 1) >> 1] | 0) | 0;
				n = (n | 0) == 1073741824 ? 2147483647 : n << 1;
				o = N(b[c + (h << 1) >> 1] | 0, g) | 0;
				o = (o | 0) == 1073741824 ? 2147483647 : o << 1;
				i = o + n | 0;
				i = (o ^ n | 0) > -1 & (i ^ n | 0) < 0 ? n >> 31 ^ 2147483647 : i;
				b[j + (h << 1) >> 1] = (i | 0) == 2147483647 ? 32767 : (i + 32768 | 0) >>> 16 & 65535;
				h = h + 1 | 0
			} while ((h | 0) != 16);
			Za(j, e, 16, 0);
			f = e + 34 | 0;
			g = b[d + 2 >> 1] | 0;
			h = 32767 - g | 0;
			i = h >> 31;
			i = (((h >> 15 | 0) == (i | 0) ? h : i ^ 32767) << 16 >> 16) + 1 | 0;
			h = i >> 31;
			h = ((i >> 15 | 0) == (h | 0) ? i : h ^ 32767) << 16 >> 16;
			i = 0;
			do {
				n = N(h, b[a + (i << 1) >> 1] | 0) | 0;
				n = (n | 0) == 1073741824 ? 2147483647 : n << 1;
				p = N(b[c + (i << 1) >> 1] | 0, g) | 0;
				p = (p | 0) == 1073741824 ? 2147483647 : p << 1;
				o = p + n | 0;
				o = (p ^ n | 0) > -1 & (o ^ n | 0) < 0 ? n >> 31 ^ 2147483647 : o;
				b[j + (i << 1) >> 1] = (o | 0) == 2147483647 ? 32767 : (o + 32768 | 0) >>> 16 & 65535;
				i = i + 1 | 0
			} while ((i | 0) != 16);
			Za(j, f, 16, 0);
			i = e + 68 | 0;
			f = b[d + 4 >> 1] | 0;
			g = 32767 - f | 0;
			h = g >> 31;
			h = (((g >> 15 | 0) == (h | 0) ? g : h ^ 32767) << 16 >> 16) + 1 | 0;
			g = h >> 31;
			g = ((h >> 15 | 0) == (g | 0) ? h : g ^ 32767) << 16 >> 16;
			h = 0;
			do {
				o = N(g, b[a + (h << 1) >> 1] | 0) | 0;
				o = (o | 0) == 1073741824 ? 2147483647 : o << 1;
				n = N(b[c + (h << 1) >> 1] | 0, f) | 0;
				n = (n | 0) == 1073741824 ? 2147483647 : n << 1;
				p = n + o | 0;
				p = (n ^ o | 0) > -1 & (p ^ o | 0) < 0 ? o >> 31 ^ 2147483647 : p;
				b[j + (h << 1) >> 1] = (p | 0) == 2147483647 ? 32767 : (p + 32768 | 0) >>> 16 & 65535;
				h = h + 1 | 0
			} while ((h | 0) != 16);
			Za(j, i, 16, 0);
			Za(c, e + 102 | 0, 16, 0);
			l = k;
			return
		}

		function Ya(a) {
			a = a | 0;
			var d = 0,
				e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0,
				E = 0,
				F = 0,
				G = 0,
				H = 0,
				I = 0,
				J = 0,
				K = 0,
				L = 0,
				M = 0,
				O = 0,
				P = 0,
				Q = 0,
				R = 0,
				S = 0,
				T = 0,
				U = 0,
				V = 0,
				X = 0,
				Y = 0,
				Z = 0,
				_ = 0,
				$ = 0,
				aa = 0,
				ba = 0,
				ca = 0,
				da = 0;
			aa = l;
			l = l + 48 | 0;
			if ((l | 0) >= (m | 0)) W(48);
			H = aa + 16 | 0;
			E = aa;
			F = aa + 14 | 0;
			G = aa + 12 | 0;
			U = a + 30 | 0;
			b[a + 38 >> 1] = b[U >> 1] | 0;
			Z = a + 2 | 0;
			i = b[Z >> 1] | 0;
			da = i - (b[a >> 1] | 0) | 0;
			M = da >> 31;
			b[H >> 1] = (da >> 15 | 0) == (M | 0) ? da : M ^ 32767;
			M = a + 4 | 0;
			da = b[M >> 1] | 0;
			i = da - i | 0;
			P = i >> 31;
			O = H + 2 | 0;
			b[O >> 1] = (i >> 15 | 0) == (P | 0) ? i : P ^ 32767;
			P = a + 6 | 0;
			i = b[P >> 1] | 0;
			da = i - da | 0;
			R = da >> 31;
			Q = H + 4 | 0;
			b[Q >> 1] = (da >> 15 | 0) == (R | 0) ? da : R ^ 32767;
			R = a + 8 | 0;
			da = b[R >> 1] | 0;
			i = da - i | 0;
			T = i >> 31;
			S = H + 6 | 0;
			b[S >> 1] = (i >> 15 | 0) == (T | 0) ? i : T ^ 32767;
			T = a + 10 | 0;
			i = b[T >> 1] | 0;
			da = i - da | 0;
			V = da >> 31;
			z = H + 8 | 0;
			b[z >> 1] = (da >> 15 | 0) == (V | 0) ? da : V ^ 32767;
			V = a + 12 | 0;
			da = b[V >> 1] | 0;
			i = da - i | 0;
			X = i >> 31;
			A = H + 10 | 0;
			b[A >> 1] = (i >> 15 | 0) == (X | 0) ? i : X ^ 32767;
			X = a + 14 | 0;
			i = b[X >> 1] | 0;
			da = i - da | 0;
			Y = da >> 31;
			B = H + 12 | 0;
			b[B >> 1] = (da >> 15 | 0) == (Y | 0) ? da : Y ^ 32767;
			Y = a + 16 | 0;
			da = b[Y >> 1] | 0;
			i = da - i | 0;
			_ = i >> 31;
			C = H + 14 | 0;
			b[C >> 1] = (i >> 15 | 0) == (_ | 0) ? i : _ ^ 32767;
			_ = a + 18 | 0;
			i = b[_ >> 1] | 0;
			da = i - da | 0;
			$ = da >> 31;
			D = H + 16 | 0;
			b[D >> 1] = (da >> 15 | 0) == ($ | 0) ? da : $ ^ 32767;
			$ = a + 20 | 0;
			da = b[$ >> 1] | 0;
			i = da - i | 0;
			I = i >> 31;
			d = H + 18 | 0;
			b[d >> 1] = (i >> 15 | 0) == (I | 0) ? i : I ^ 32767;
			I = a + 22 | 0;
			i = b[I >> 1] | 0;
			da = i - da | 0;
			J = da >> 31;
			e = H + 20 | 0;
			b[e >> 1] = (da >> 15 | 0) == (J | 0) ? da : J ^ 32767;
			J = a + 24 | 0;
			da = b[J >> 1] | 0;
			i = da - i | 0;
			K = i >> 31;
			f = H + 22 | 0;
			b[f >> 1] = (i >> 15 | 0) == (K | 0) ? i : K ^ 32767;
			K = a + 26 | 0;
			i = b[K >> 1] | 0;
			da = i - da | 0;
			L = da >> 31;
			g = H + 24 | 0;
			b[g >> 1] = (da >> 15 | 0) == (L | 0) ? da : L ^ 32767;
			L = a + 28 | 0;
			i = (b[L >> 1] | 0) - i | 0;
			da = i >> 31;
			h = H + 26 | 0;
			b[h >> 1] = (i >> 15 | 0) == (da | 0) ? i : da ^ 32767;
			da = b[Q >> 1] | 0;
			da = (da * 2731 | 0) == 1073741824 ? 2147483647 : da * 5462 | 0;
			i = b[S >> 1] | 0;
			i = (i * 2731 | 0) == 1073741824 ? 2147483647 : i * 5462 | 0;
			ca = i + da | 0;
			ca = (i ^ da | 0) > -1 & (ca ^ da | 0) < 0 ? da >> 31 ^ 2147483647 : ca;
			da = b[z >> 1] | 0;
			da = (da * 2731 | 0) == 1073741824 ? 2147483647 : da * 5462 | 0;
			i = da + ca | 0;
			i = (da ^ ca | 0) > -1 & (i ^ ca | 0) < 0 ? ca >> 31 ^ 2147483647 : i;
			ca = b[A >> 1] | 0;
			ca = (ca * 2731 | 0) == 1073741824 ? 2147483647 : ca * 5462 | 0;
			da = ca + i | 0;
			da = (ca ^ i | 0) > -1 & (da ^ i | 0) < 0 ? i >> 31 ^ 2147483647 : da;
			i = b[B >> 1] | 0;
			i = (i * 2731 | 0) == 1073741824 ? 2147483647 : i * 5462 | 0;
			ca = i + da | 0;
			ca = (i ^ da | 0) > -1 & (ca ^ da | 0) < 0 ? da >> 31 ^ 2147483647 : ca;
			da = b[C >> 1] | 0;
			da = (da * 2731 | 0) == 1073741824 ? 2147483647 : da * 5462 | 0;
			i = da + ca | 0;
			i = (da ^ ca | 0) > -1 & (i ^ ca | 0) < 0 ? ca >> 31 ^ 2147483647 : i;
			ca = b[D >> 1] | 0;
			ca = (ca * 2731 | 0) == 1073741824 ? 2147483647 : ca * 5462 | 0;
			da = ca + i | 0;
			da = (ca ^ i | 0) > -1 & (da ^ i | 0) < 0 ? i >> 31 ^ 2147483647 : da;
			i = b[d >> 1] | 0;
			i = (i * 2731 | 0) == 1073741824 ? 2147483647 : i * 5462 | 0;
			ca = i + da | 0;
			ca = (i ^ da | 0) > -1 & (ca ^ da | 0) < 0 ? da >> 31 ^ 2147483647 : ca;
			da = b[e >> 1] | 0;
			i = da << 16 >> 16;
			i = (i * 2731 | 0) == 1073741824 ? 2147483647 : i * 5462 | 0;
			w = i + ca | 0;
			w = (i ^ ca | 0) > -1 & (w ^ ca | 0) < 0 ? ca >> 31 ^ 2147483647 : w;
			ca = b[f >> 1] | 0;
			i = ca << 16 >> 16;
			i = (i * 2731 | 0) == 1073741824 ? 2147483647 : i * 5462 | 0;
			x = i + w | 0;
			x = (i ^ w | 0) > -1 & (x ^ w | 0) < 0 ? w >> 31 ^ 2147483647 : x;
			w = b[g >> 1] | 0;
			i = w << 16 >> 16;
			j = (i * 2731 | 0) == 1073741824 ? 2147483647 : i * 5462 | 0;
			y = j + x | 0;
			y = (j ^ x | 0) > -1 & (y ^ x | 0) < 0 ? x >> 31 ^ 2147483647 : y;
			x = b[h >> 1] | 0;
			j = x << 16 >> 16;
			ba = (j * 2731 | 0) == 1073741824 ? 2147483647 : j * 5462 | 0;
			v = ba + y | 0;
			v = (ba ^ y | 0) > -1 & (v ^ y | 0) < 0 ? y >> 31 ^ 2147483647 : v;
			c[E >> 2] = 0;
			y = b[H >> 1] | 0;
			ba = y << 16 >> 16 > 0 ? y : 0;
			k = b[O >> 1] | 0;
			ba = k << 16 >> 16 > ba << 16 >> 16 ? k : ba;
			n = b[Q >> 1] | 0;
			ba = n << 16 >> 16 > ba << 16 >> 16 ? n : ba;
			o = b[S >> 1] | 0;
			ba = o << 16 >> 16 > ba << 16 >> 16 ? o : ba;
			p = b[z >> 1] | 0;
			ba = p << 16 >> 16 > ba << 16 >> 16 ? p : ba;
			q = b[A >> 1] | 0;
			ba = q << 16 >> 16 > ba << 16 >> 16 ? q : ba;
			r = b[B >> 1] | 0;
			ba = r << 16 >> 16 > ba << 16 >> 16 ? r : ba;
			s = b[C >> 1] | 0;
			ba = s << 16 >> 16 > ba << 16 >> 16 ? s : ba;
			t = b[D >> 1] | 0;
			ba = t << 16 >> 16 > ba << 16 >> 16 ? t : ba;
			u = b[d >> 1] | 0;
			ba = u << 16 >> 16 > ba << 16 >> 16 ? u : ba;
			ba = da << 16 >> 16 > ba << 16 >> 16 ? da : ba;
			ba = ca << 16 >> 16 > ba << 16 >> 16 ? ca : ba;
			ba = w << 16 >> 16 > ba << 16 >> 16 ? w : ba;
			v = (v | 0) == 2147483647 ? 32767 : (v + 32768 | 0) >>> 16 & 65535;
			ba = ((gb((x << 16 >> 16 > ba << 16 >> 16 ? x : ba) << 16 >> 16) | 0) & 65535) + 65520 | 0;
			x = ba << 16 >> 16;
			w = 0 - x & 15;
			x = x & 15;
			y = y << 16 >> 16;
			if ((ba & 65535) << 16 >> 16 < 0) {
				b[H >> 1] = y >> w;
				b[O >> 1] = k << 16 >> 16 >> w;
				b[Q >> 1] = n << 16 >> 16 >> w;
				b[S >> 1] = o << 16 >> 16 >> w;
				b[z >> 1] = p << 16 >> 16 >> w;
				b[A >> 1] = q << 16 >> 16 >> w;
				b[B >> 1] = r << 16 >> 16 >> w;
				da = s << 16 >> 16 >> w & 65535;
				b[C >> 1] = da;
				b[D >> 1] = t << 16 >> 16 >> w;
				b[d >> 1] = u << 16 >> 16 >> w;
				b[e >> 1] = b[e >> 1] >> w;
				b[f >> 1] = b[f >> 1] >> w;
				b[g >> 1] = i >> w;
				b[h >> 1] = j >> w;
				d = v << 16 >> 16 >> w;
				e = da
			} else {
				da = y << x;
				b[H >> 1] = (da << 16 >> 16 >> x | 0) == (y | 0) ? da : y >>> 15 ^ 32767;
				da = k << 16 >> 16;
				ca = da << x;
				b[O >> 1] = (ca << 16 >> 16 >> x | 0) == (da | 0) ? ca : da >>> 15 ^ 32767;
				da = n << 16 >> 16;
				ca = da << x;
				b[Q >> 1] = (ca << 16 >> 16 >> x | 0) == (da | 0) ? ca : da >>> 15 ^ 32767;
				da = o << 16 >> 16;
				ca = da << x;
				b[S >> 1] = (ca << 16 >> 16 >> x | 0) == (da | 0) ? ca : da >>> 15 ^ 32767;
				da = p << 16 >> 16;
				ca = da << x;
				b[z >> 1] = (ca << 16 >> 16 >> x | 0) == (da | 0) ? ca : da >>> 15 ^ 32767;
				da = q << 16 >> 16;
				ca = da << x;
				b[A >> 1] = (ca << 16 >> 16 >> x | 0) == (da | 0) ? ca : da >>> 15 ^ 32767;
				da = r << 16 >> 16;
				ca = da << x;
				b[B >> 1] = (ca << 16 >> 16 >> x | 0) == (da | 0) ? ca : da >>> 15 ^ 32767;
				da = s << 16 >> 16;
				ca = da << x;
				da = ((ca << 16 >> 16 >> x | 0) == (da | 0) ? ca : da >>> 15 ^ 32767) & 65535;
				b[C >> 1] = da;
				ca = t << 16 >> 16;
				ba = ca << x;
				b[D >> 1] = (ba << 16 >> 16 >> x | 0) == (ca | 0) ? ba : ca >>> 15 ^ 32767;
				ca = u << 16 >> 16;
				ba = ca << x;
				b[d >> 1] = (ba << 16 >> 16 >> x | 0) == (ca | 0) ? ba : ca >>> 15 ^ 32767;
				d = b[e >> 1] | 0;
				ca = d << x;
				b[e >> 1] = (ca << 16 >> 16 >> x | 0) == (d | 0) ? ca : d >>> 15 ^ 32767;
				d = b[f >> 1] | 0;
				e = d << x;
				b[f >> 1] = (e << 16 >> 16 >> x | 0) == (d | 0) ? e : d >>> 15 ^ 32767;
				d = b[g >> 1] | 0;
				e = d << x;
				b[g >> 1] = (e << 16 >> 16 >> x | 0) == (d | 0) ? e : d >>> 15 ^ 32767;
				d = b[h >> 1] | 0;
				e = d << x;
				b[h >> 1] = (e << 16 >> 16 >> x | 0) == (d | 0) ? e : d >>> 15 ^ 32767;
				d = v << 16 >> 16;
				e = d << x;
				d = (e << 16 >> 16 >> x | 0) == (d | 0) ? e : d >> 15 ^ 32767;
				e = da
			}
			i = d << 16 >> 16;
			f = c[E >> 2] | 0;
			d = 7;
			while (1) {
				ca = (e << 16 >> 16) - i | 0;
				da = ca >> 31;
				D = (b[H + (d + -2 << 1) >> 1] | 0) - i | 0;
				ba = D >> 31;
				da = N(((D >> 15 | 0) == (ba | 0) ? D : ba ^ 32767) << 16 >> 16, ((ca >> 15 | 0) == (da | 0) ? ca : da ^
					32767) << 16 >> 16) | 0;
				Ab((da | 0) == 1073741824 ? 2147483647 : da << 1, F, G);
				da = b[F >> 1] | 0;
				ca = b[G >> 1] | 0;
				ca = Bb(da, ca, da, ca) | 0;
				da = f + ca | 0;
				f = (f ^ ca | 0) > -1 & (da ^ f | 0) < 0 ? f >> 31 ^ 2147483647 : da;
				d = d + 1 | 0;
				if ((d | 0) == 14) break;
				e = b[H + (d << 1) >> 1] | 0
			}
			c[E >> 2] = f;
			d = E + 4 | 0;
			c[d >> 2] = 0;
			h = 0;
			e = 7;
			do {
				ca = (b[H + (e << 1) >> 1] | 0) - i | 0;
				da = ca >> 31;
				D = (b[H + (e + -3 << 1) >> 1] | 0) - i | 0;
				ba = D >> 31;
				da = N(((D >> 15 | 0) == (ba | 0) ? D : ba ^ 32767) << 16 >> 16, ((ca >> 15 | 0) == (da | 0) ? ca : da ^
					32767) << 16 >> 16) | 0;
				Ab((da | 0) == 1073741824 ? 2147483647 : da << 1, F, G);
				da = b[F >> 1] | 0;
				ca = b[G >> 1] | 0;
				ca = Bb(da, ca, da, ca) | 0;
				da = h + ca | 0;
				h = (h ^ ca | 0) > -1 & (da ^ h | 0) < 0 ? h >> 31 ^ 2147483647 : da;
				e = e + 1 | 0
			} while ((e | 0) != 14);
			c[d >> 2] = h;
			e = E + 8 | 0;
			c[e >> 2] = 0;
			d = 0;
			g = 7;
			do {
				ca = (b[H + (g << 1) >> 1] | 0) - i | 0;
				da = ca >> 31;
				D = (b[H + (g + -4 << 1) >> 1] | 0) - i | 0;
				ba = D >> 31;
				da = N(((D >> 15 | 0) == (ba | 0) ? D : ba ^ 32767) << 16 >> 16, ((ca >> 15 | 0) == (da | 0) ? ca : da ^
					32767) << 16 >> 16) | 0;
				Ab((da | 0) == 1073741824 ? 2147483647 : da << 1, F, G);
				da = b[F >> 1] | 0;
				ca = b[G >> 1] | 0;
				ca = Bb(da, ca, da, ca) | 0;
				da = d + ca | 0;
				d = (d ^ ca | 0) > -1 & (da ^ d | 0) < 0 ? d >> 31 ^ 2147483647 : da;
				g = g + 1 | 0
			} while ((g | 0) != 14);
			c[e >> 2] = d;
			i = (f | 0) <= (h | 0);
			i = (d | 0) > (c[E + ((i & 1) << 2) >> 2] | 0) ? 3 : i ? 2 : 1;
			d = -2 - i | 0;
			j = (b[a + (14 - i << 1) >> 1] | 0) - (b[a + (d + 15 << 1) >> 1] | 0) | 0;
			h = j >> 31;
			h = (((j >> 15 | 0) == (h | 0) ? j : h ^ 32767) << 16 >> 16) + (b[L >> 1] | 0) | 0;
			j = h >> 31;
			j = (h >> 15 | 0) == (j | 0) ? h : j ^ 32767;
			b[U >> 1] = j;
			h = (b[a + ((i ^ 15) << 1) >> 1] | 0) - (b[a + (d + 16 << 1) >> 1] | 0) | 0;
			k = h >> 31;
			j = (((h >> 15 | 0) == (k | 0) ? h : k ^ 32767) << 16 >> 16) + (j << 16 >> 16) | 0;
			k = j >> 31;
			k = (j >> 15 | 0) == (k | 0) ? j : k ^ 32767;
			j = a + 32 | 0;
			b[j >> 1] = k;
			h = (b[a + (16 - i << 1) >> 1] | 0) - (b[a + (d + 17 << 1) >> 1] | 0) | 0;
			n = h >> 31;
			k = (((h >> 15 | 0) == (n | 0) ? h : n ^ 32767) << 16 >> 16) + (k << 16 >> 16) | 0;
			n = k >> 31;
			n = (k >> 15 | 0) == (n | 0) ? k : n ^ 32767;
			k = a + 34 | 0;
			b[k >> 1] = n;
			d = (b[a + (17 - i << 1) >> 1] | 0) - (b[a + (d + 18 << 1) >> 1] | 0) | 0;
			i = d >> 31;
			n = (((d >> 15 | 0) == (i | 0) ? d : i ^ 32767) << 16 >> 16) + (n << 16 >> 16) | 0;
			i = n >> 31;
			i = (n >> 15 | 0) == (i | 0) ? n : i ^ 32767;
			n = a + 36 | 0;
			b[n >> 1] = i;
			d = (b[P >> 1] | 0) + (b[R >> 1] | 0) | 0;
			h = d >> 31;
			h = (b[M >> 1] | 0) - (((d >> 15 | 0) == (h | 0) ? d : h ^ 32767) << 16 >> 16) | 0;
			d = h >> 31;
			d = (((h >> 15 | 0) == (d | 0) ? h : d ^ 32767) << 16 >> 16) * 5461 | 0;
			h = d >> 31;
			h = (((d >> 30 | 0) == (h | 0) ? d >>> 15 : h ^ 32767) << 16) + 1336279040 | 0;
			d = b[L >> 1] | 0;
			h = ((h | 0) > 1275068416 ? 19456 : h >> 16) - d | 0;
			e = h >> 31;
			d = (i << 16 >> 16) - d | 0;
			i = d >> 31;
			i = ((d >> 15 | 0) == (i | 0) ? d : i ^ 32767) << 16 >> 16;
			d = (gb(i) | 0) & 65535;
			e = ((h >> 15 | 0) == (e | 0) ? h : e ^ 32767) << 16 >> 16;
			h = (((gb(e) | 0) & 65535) << 16) + -1114112 >> 16;
			d = (d << 16) + -1048576 >> 16;
			da = d - h | 0;
			d = (ub(e << h & 65535, i << d & 65535) | 0) << 16 >> 16;
			i = da << 16 >> 16;
			h = 0 - i & 15;
			i = i & 15;
			e = b[U >> 1] | 0;
			g = e - (b[L >> 1] | 0) | 0;
			f = g >> 31;
			f = N(((g >> 15 | 0) == (f | 0) ? g : f ^ 32767) << 16 >> 16, d) | 0;
			g = f >> 31;
			g = ((f >> 30 | 0) == (g | 0) ? f >>> 15 : g ^ 32767) << 16;
			f = g >> 16;
			if ((da & 65535) << 16 >> 16 < 0) {
				g = f >> h & 65535;
				b[H >> 1] = g;
				da = b[j >> 1] | 0;
				ca = da - e | 0;
				f = ca >> 31;
				f = N(((ca >> 15 | 0) == (f | 0) ? ca : f ^ 32767) << 16 >> 16, d) | 0;
				ca = f >> 31;
				ca = ((f >> 30 | 0) == (ca | 0) ? f >>> 15 : ca ^ 32767) << 16 >> 16 >> h & 65535;
				b[O >> 1] = ca;
				f = b[k >> 1] | 0;
				e = f - da | 0;
				da = e >> 31;
				da = N(((e >> 15 | 0) == (da | 0) ? e : da ^ 32767) << 16 >> 16, d) | 0;
				e = da >> 31;
				e = ((da >> 30 | 0) == (e | 0) ? da >>> 15 : e ^ 32767) << 16 >> 16 >> h & 65535;
				b[Q >> 1] = e;
				f = (b[n >> 1] | 0) - f | 0;
				da = f >> 31;
				da = N(((f >> 15 | 0) == (da | 0) ? f : da ^ 32767) << 16 >> 16, d) | 0;
				f = da >> 31;
				d = ca;
				f = ((da >> 30 | 0) == (f | 0) ? da >>> 15 : f ^ 32767) << 16 >> 16 >> h
			} else {
				da = f << i;
				g = ((da << 16 >> 16 >> i | 0) == (f | 0) ? da : g >> 31 ^ 32767) & 65535;
				b[H >> 1] = g;
				da = b[j >> 1] | 0;
				ba = da - e | 0;
				e = ba >> 31;
				e = N(((ba >> 15 | 0) == (e | 0) ? ba : e ^ 32767) << 16 >> 16, d) | 0;
				ba = e >> 31;
				ba = ((e >> 30 | 0) == (ba | 0) ? e >>> 15 : ba ^ 32767) << 16;
				e = ba >> 16;
				f = e << i;
				ba = ((f << 16 >> 16 >> i | 0) == (e | 0) ? f : ba >> 31 ^ 32767) & 65535;
				b[O >> 1] = ba;
				f = b[k >> 1] | 0;
				e = f - da | 0;
				da = e >> 31;
				da = N(((e >> 15 | 0) == (da | 0) ? e : da ^ 32767) << 16 >> 16, d) | 0;
				e = da >> 31;
				e = ((da >> 30 | 0) == (e | 0) ? da >>> 15 : e ^ 32767) << 16;
				da = e >> 16;
				ca = da << i;
				e = ((ca << 16 >> 16 >> i | 0) == (da | 0) ? ca : e >> 31 ^ 32767) & 65535;
				b[Q >> 1] = e;
				f = (b[n >> 1] | 0) - f | 0;
				ca = f >> 31;
				ca = N(((f >> 15 | 0) == (ca | 0) ? f : ca ^ 32767) << 16 >> 16, d) | 0;
				f = ca >> 31;
				f = ((ca >> 30 | 0) == (f | 0) ? ca >>> 15 : f ^ 32767) << 16;
				ca = f >> 16;
				da = ca << i;
				d = ba;
				f = (da << 16 >> 16 >> i | 0) == (ca | 0) ? da : f >> 31 ^ 32767
			}
			b[S >> 1] = f;
			if ((((g & 65535) + (d & 65535) << 16) + -83886080 | 0) < 0) {
				e = d << 16 >> 16 > g << 16 >> 16;
				b[H + (((e ^ 1) & 1) << 1) >> 1] = 1280 - ((e ? d : g) & 65535);
				e = b[Q >> 1] | 0;
				d = b[O >> 1] | 0
			}
			if ((((d & 65535) + (e & 65535) << 16) + -83886080 | 0) < 0) {
				da = e << 16 >> 16 > d << 16 >> 16;
				b[H + ((da ? 1 : 2) << 1) >> 1] = 1280 - ((da ? e : d) & 65535);
				e = b[Q >> 1] | 0
			}
			d = b[S >> 1] | 0;
			if ((((e & 65535) + (d & 65535) << 16) + -83886080 | 0) >= 0) {
				da = e;
				ca = d;
				ba = b[L >> 1] | 0;
				S = b[H >> 1] | 0;
				ba = ba << 16 >> 16;
				S = S << 16 >> 16;
				ba = S + ba | 0;
				S = ba >> 15;
				Q = ba >> 31;
				S = (S | 0) == (Q | 0);
				Q = Q ^ 32767;
				Q = S ? ba : Q;
				ba = Q & 65535;
				b[U >> 1] = ba;
				ba = b[O >> 1] | 0;
				Q = Q << 16;
				Q = Q >> 16;
				ba = ba << 16 >> 16;
				ba = Q + ba | 0;
				Q = ba >> 15;
				S = ba >> 31;
				Q = (Q | 0) == (S | 0);
				S = S ^ 32767;
				S = Q ? ba : S;
				ba = S & 65535;
				b[j >> 1] = ba;
				S = S << 16;
				S = S >> 16;
				da = da << 16 >> 16;
				da = S + da | 0;
				S = da >> 15;
				ba = da >> 31;
				S = (S | 0) == (ba | 0);
				ba = ba ^ 32767;
				ba = S ? da : ba;
				da = ba & 65535;
				b[k >> 1] = da;
				ba = ba << 16;
				ba = ba >> 16;
				ca = ca << 16 >> 16;
				ca = ba + ca | 0;
				ba = ca >> 15;
				da = ca >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[n >> 1] = da;
				da = b[a >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[a >> 1] = da;
				da = b[Z >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[Z >> 1] = da;
				da = b[M >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[M >> 1] = da;
				da = b[P >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[P >> 1] = da;
				da = b[R >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[R >> 1] = da;
				da = b[T >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[T >> 1] = da;
				da = b[V >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[V >> 1] = da;
				da = b[X >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[X >> 1] = da;
				da = b[Y >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[Y >> 1] = da;
				da = b[_ >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[_ >> 1] = da;
				da = b[$ >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[$ >> 1] = da;
				da = b[I >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[I >> 1] = da;
				da = b[J >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[J >> 1] = da;
				da = b[K >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[K >> 1] = da;
				da = b[L >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[L >> 1] = da;
				da = b[U >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[U >> 1] = da;
				da = b[j >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[j >> 1] = da;
				da = b[k >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[k >> 1] = da;
				da = b[n >> 1] | 0;
				da = da << 16 >> 16;
				da = da * 26214 | 0;
				ca = da >>> 15;
				ba = da >> 30;
				da = da >> 31;
				ba = (ba | 0) == (da | 0);
				da = da ^ 32767;
				da = ba ? ca : da;
				da = da & 65535;
				b[n >> 1] = da;
				_a(a, a, 20);
				l = aa;
				return
			}
			da = d << 16 >> 16 > e << 16 >> 16;
			b[H + ((da ? 2 : 3) << 1) >> 1] = 1280 - ((da ? d : e) & 65535);
			da = b[Q >> 1] | 0;
			ca = b[S >> 1] | 0;
			ba = b[L >> 1] | 0;
			S = b[H >> 1] | 0;
			ba = ba << 16 >> 16;
			S = S << 16 >> 16;
			ba = S + ba | 0;
			S = ba >> 15;
			Q = ba >> 31;
			S = (S | 0) == (Q | 0);
			Q = Q ^ 32767;
			Q = S ? ba : Q;
			ba = Q & 65535;
			b[U >> 1] = ba;
			ba = b[O >> 1] | 0;
			Q = Q << 16;
			Q = Q >> 16;
			ba = ba << 16 >> 16;
			ba = Q + ba | 0;
			Q = ba >> 15;
			S = ba >> 31;
			Q = (Q | 0) == (S | 0);
			S = S ^ 32767;
			S = Q ? ba : S;
			ba = S & 65535;
			b[j >> 1] = ba;
			S = S << 16;
			S = S >> 16;
			da = da << 16 >> 16;
			da = S + da | 0;
			S = da >> 15;
			ba = da >> 31;
			S = (S | 0) == (ba | 0);
			ba = ba ^ 32767;
			ba = S ? da : ba;
			da = ba & 65535;
			b[k >> 1] = da;
			ba = ba << 16;
			ba = ba >> 16;
			ca = ca << 16 >> 16;
			ca = ba + ca | 0;
			ba = ca >> 15;
			da = ca >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[n >> 1] = da;
			da = b[a >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[a >> 1] = da;
			da = b[Z >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[Z >> 1] = da;
			da = b[M >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[M >> 1] = da;
			da = b[P >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[P >> 1] = da;
			da = b[R >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[R >> 1] = da;
			da = b[T >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[T >> 1] = da;
			da = b[V >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[V >> 1] = da;
			da = b[X >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[X >> 1] = da;
			da = b[Y >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[Y >> 1] = da;
			da = b[_ >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[_ >> 1] = da;
			da = b[$ >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[$ >> 1] = da;
			da = b[I >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[I >> 1] = da;
			da = b[J >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[J >> 1] = da;
			da = b[K >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[K >> 1] = da;
			da = b[L >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[L >> 1] = da;
			da = b[U >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[U >> 1] = da;
			da = b[j >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[j >> 1] = da;
			da = b[k >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[k >> 1] = da;
			da = b[n >> 1] | 0;
			da = da << 16 >> 16;
			da = da * 26214 | 0;
			ca = da >>> 15;
			ba = da >> 30;
			da = da >> 31;
			ba = (ba | 0) == (da | 0);
			da = da ^ 32767;
			da = ba ? ca : da;
			da = da & 65535;
			b[n >> 1] = da;
			_a(a, a, 20);
			l = aa;
			return
		}

		function Za(a, d, f, g) {
			a = a | 0;
			d = d | 0;
			f = f | 0;
			g = g | 0;
			var h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0,
				E = 0,
				F = 0,
				G = 0,
				H = 0;
			H = l;
			l = l + 96 | 0;
			if ((l | 0) >= (m | 0)) W(96);
			E = H + 40 | 0;
			F = H;
			G = f << 16 >> 16;
			C = f << 16 >> 16 >> 1;
			D = C << 16 >> 16;
			if (C << 16 >> 16 > 8) {
				c[E >> 2] = 2097152;
				c[E + 4 >> 2] = 0 - (b[a >> 1] | 0) << 7;
				w = C + -1 & 65535;
				j = E + 8 | 0;
				s = a;
				u = 0;
				v = 2;
				while (1) {
					n = 0 - u | 0;
					s = s + 4 | 0;
					i = c[j + -8 >> 2] | 0;
					c[j >> 2] = i;
					t = b[s >> 1] | 0;
					o = (t & 65535) << 16;
					p = ((o | 0) < 0) << 31 >> 31;
					f = 1;
					k = j;
					h = i;
					while (1) {
						q = k + -4 | 0;
						r = c[q >> 2] | 0;
						bc(r | 0, ((r | 0) < 0) << 31 >> 31 | 0, o | 0, p | 0) | 0;
						B = y;
						A = dc(B | 0, 0, 2) | 0;
						c[k >> 2] = i + h - ((A >> 2 | 0) == (B | 0) ? A : B >> 31 ^ 2147483647);
						f = f + 1 << 16 >> 16;
						if ((v | 0) <= (f << 16 >> 16 | 0)) break;
						h = c[k + -12 >> 2] | 0;
						k = q;
						i = r
					}
					f = j + -4 + (n << 2) | 0;
					c[f >> 2] = (c[f >> 2] | 0) - (t << 16 >> 16 << 7);
					u = u + 1 | 0;
					if ((u | 0) == (w | 0)) break;
					else {
						j = f + (v << 2) | 0;
						v = v + 1 | 0
					}
				}
				if (C << 16 >> 16 >= 0) {
					h = C + 1 & 65535;
					f = 0;
					do {
						B = E + (f << 2) | 0;
						A = c[B >> 2] | 0;
						z = A << 2;
						c[B >> 2] = (z >> 2 | 0) == (A | 0) ? z : A >> 31 ^ 2147483647;
						f = f + 1 | 0
					} while ((f | 0) != (h | 0))
				}
				f = a + 2 | 0;
				z = D + 65535 | 0;
				x = z & 65535;
				c[F >> 2] = 2097152;
				c[F + 4 >> 2] = 0 - (b[f >> 1] | 0) << 7;
				if (x << 16 >> 16 >= 2) {
					w = z << 16 >> 16;
					s = F + 8 | 0;
					u = 0;
					v = 2;
					while (1) {
						n = 0 - u | 0;
						f = f + 4 | 0;
						j = c[s + -8 >> 2] | 0;
						c[s >> 2] = j;
						t = b[f >> 1] | 0;
						o = (t & 65535) << 16;
						p = ((o | 0) < 0) << 31 >> 31;
						h = 1;
						k = s;
						i = j;
						while (1) {
							q = k + -4 | 0;
							r = c[q >> 2] | 0;
							bc(r | 0, ((r | 0) < 0) << 31 >> 31 | 0, o | 0, p | 0) | 0;
							B = y;
							A = dc(B | 0, 0, 2) | 0;
							c[k >> 2] = j + i - ((A >> 2 | 0) == (B | 0) ? A : B >> 31 ^ 2147483647);
							h = h + 1 << 16 >> 16;
							if ((v | 0) <= (h << 16 >> 16 | 0)) break;
							i = c[k + -12 >> 2] | 0;
							k = q;
							j = r
						}
						h = s + -4 + (n << 2) | 0;
						c[h >> 2] = (c[h >> 2] | 0) - (t << 16 >> 16 << 7);
						if ((v | 0) >= (w | 0)) break;
						else {
							s = h + (v << 2) | 0;
							u = u + 1 | 0;
							v = v + 1 | 0
						}
					}
				}
				if (C << 16 >> 16 > 0) {
					h = C & 65535;
					f = 0;
					do {
						B = F + (f << 2) | 0;
						A = c[B >> 2] | 0;
						w = A << 2;
						c[B >> 2] = (w >> 2 | 0) == (A | 0) ? w : A >> 31 ^ 2147483647;
						f = f + 1 | 0
					} while ((f | 0) != (h | 0));
					w = z;
					B = 31
				} else {
					w = z;
					B = 31
				}
			} else {
				c[E >> 2] = 8388608;
				c[E + 4 >> 2] = 0 - (b[a >> 1] | 0) << 9;
				if (C << 16 >> 16 >= 2) {
					j = E + 8 | 0;
					s = a;
					u = 0;
					v = 2;
					while (1) {
						n = 0 - u | 0;
						s = s + 4 | 0;
						i = c[j + -8 >> 2] | 0;
						c[j >> 2] = i;
						t = b[s >> 1] | 0;
						o = (t & 65535) << 16;
						p = ((o | 0) < 0) << 31 >> 31;
						f = 1;
						k = j;
						h = i;
						while (1) {
							q = k + -4 | 0;
							r = c[q >> 2] | 0;
							bc(r | 0, ((r | 0) < 0) << 31 >> 31 | 0, o | 0, p | 0) | 0;
							A = y;
							z = dc(A | 0, 0, 2) | 0;
							c[k >> 2] = i + h - ((z >> 2 | 0) == (A | 0) ? z : A >> 31 ^ 2147483647);
							f = f + 1 << 16 >> 16;
							if ((v | 0) <= (f << 16 >> 16 | 0)) break;
							h = c[k + -12 >> 2] | 0;
							k = q;
							i = r
						}
						f = j + -4 + (n << 2) | 0;
						c[f >> 2] = (c[f >> 2] | 0) - (t << 16 >> 16 << 9);
						if ((v | 0) >= (D | 0)) break;
						else {
							j = f + (v << 2) | 0;
							u = u + 1 | 0;
							v = v + 1 | 0
						}
					}
				}
				f = a + 2 | 0;
				z = D + 65535 | 0;
				A = z & 65535;
				c[F >> 2] = 8388608;
				c[F + 4 >> 2] = 0 - (b[f >> 1] | 0) << 9;
				if (A << 16 >> 16 >= 2) {
					w = z << 16 >> 16;
					s = F + 8 | 0;
					u = 0;
					v = 2;
					while (1) {
						n = 0 - u | 0;
						f = f + 4 | 0;
						j = c[s + -8 >> 2] | 0;
						c[s >> 2] = j;
						t = b[f >> 1] | 0;
						o = (t & 65535) << 16;
						p = ((o | 0) < 0) << 31 >> 31;
						h = 1;
						k = s;
						i = j;
						while (1) {
							q = k + -4 | 0;
							r = c[q >> 2] | 0;
							bc(r | 0, ((r | 0) < 0) << 31 >> 31 | 0, o | 0, p | 0) | 0;
							B = y;
							x = dc(B | 0, 0, 2) | 0;
							c[k >> 2] = j + i - ((x >> 2 | 0) == (B | 0) ? x : B >> 31 ^ 2147483647);
							h = h + 1 << 16 >> 16;
							if ((v | 0) <= (h << 16 >> 16 | 0)) break;
							i = c[k + -12 >> 2] | 0;
							k = q;
							j = r
						}
						h = s + -4 + (n << 2) | 0;
						c[h >> 2] = (c[h >> 2] | 0) - (t << 16 >> 16 << 9);
						if ((v | 0) >= (w | 0)) {
							x = A;
							w = z;
							B = 31;
							break
						} else {
							s = h + (v << 2) | 0;
							u = u + 1 | 0;
							v = v + 1 | 0
						}
					}
				}
			}
			if ((B | 0) == 31 ? x << 16 >> 16 > 1 : 0) {
				f = w << 16 >> 16;
				while (1) {
					B = F + (f << 2) | 0;
					c[B >> 2] = (c[B >> 2] | 0) - (c[F + (f + -2 << 2) >> 2] | 0);
					if ((f | 0) > 2) f = f + -1 | 0;
					else break
				}
			}
			q = G + -1 | 0;
			if (C << 16 >> 16 > 0) {
				f = e[a + (q << 1) >> 1] << 16;
				h = ((f | 0) < 0) << 31 >> 31;
				j = C & 65535;
				i = 0;
				do {
					x = E + (i << 2) | 0;
					w = c[x >> 2] | 0;
					B = F + (i << 2) | 0;
					z = c[B >> 2] | 0;
					v = bc(f | 0, h | 0, w | 0, ((w | 0) < 0) << 31 >> 31 | 0) | 0;
					v = cc(v | 0, y | 0, 31) | 0;
					A = bc(f | 0, h | 0, z | 0, ((z | 0) < 0) << 31 >> 31 | 0) | 0;
					A = cc(A | 0, y | 0, 31) | 0;
					c[x >> 2] = (v & -2) + w;
					c[B >> 2] = z - (A & -2);
					i = i + 1 | 0
				} while ((i | 0) != (j | 0));
				b[d >> 1] = 4096;
				n = q & 65535;
				k = C << 16 >> 16 > 1;
				if (k) {
					j = C & 65535;
					h = n;
					f = 1;
					i = 1;
					while (1) {
						w = c[E + (i << 2) >> 2] | 0;
						B = c[F + (i << 2) >> 2] | 0;
						v = B + w | 0;
						x = B ^ w;
						A = w >> 31 ^ 2147483647;
						v = (x | 0) > -1 & (v ^ w | 0) < 0 ? A : v;
						z = v - (v >>> 31) | 0;
						b[d + (i << 1) >> 1] = (v >>> 11 & 1) + (v >>> 12);
						B = w - B | 0;
						B = ((B ^ w) & x | 0) < 0 ? A : B;
						A = B - (B >>> 31) | 0;
						f = z >> 31 ^ z | f | A >> 31 ^ A;
						b[d + (h << 16 >> 16 << 1) >> 1] = (B >>> 11 & 1) + (B >>> 12);
						i = i + 1 | 0;
						if ((i | 0) == (j | 0)) {
							h = n;
							break
						} else h = h + -1 << 16 >> 16
					}
				} else {
					f = 1;
					k = 0;
					h = n
				}
			} else {
				b[d >> 1] = 4096;
				f = 1;
				k = 0;
				h = q & 65535
			}
			if (g << 16 >> 16 != 1) {
				B = 12;
				F = 3;
				C = E + (D << 2) | 0;
				C = c[C >> 2] | 0;
				g = (C | 0) < 0;
				g = g << 31 >> 31;
				E = a + (q << 1) | 0;
				a = b[E >> 1] | 0;
				a = a << 16 >> 16;
				A = (a | 0) < 0;
				A = A << 31 >> 31;
				g = bc(a | 0, A | 0, C | 0, g | 0) | 0;
				A = y;
				A = cc(g | 0, A | 0, 15) | 0;
				g = A & -2;
				g = g + C | 0;
				A = C ^ A;
				A = (A | 0) > -1;
				a = g ^ C;
				a = (a | 0) < 0;
				a = A & a;
				C = C >> 31;
				C = C ^ 2147483647;
				g = a ? C : g;
				C = g >> B;
				a = B + -1 | 0;
				a = g >>> a;
				a = a & 1;
				C = a + C | 0;
				C = C & 65535;
				a = d + (D << 1) | 0;
				b[a >> 1] = C;
				E = b[E >> 1] | 0;
				F = tb(E, F) | 0;
				G = d + (G << 1) | 0;
				b[G >> 1] = F;
				l = H;
				return
			}
			o = gb(f) | 0;
			g = 4 - (o & 65535) | 0;
			f = g << 16;
			p = f >> 16;
			if ((g & 65535) << 16 >> 16 <= 0) {
				B = 12;
				F = 3;
				C = E + (D << 2) | 0;
				C = c[C >> 2] | 0;
				g = (C | 0) < 0;
				g = g << 31 >> 31;
				E = a + (q << 1) | 0;
				a = b[E >> 1] | 0;
				a = a << 16 >> 16;
				A = (a | 0) < 0;
				A = A << 31 >> 31;
				g = bc(a | 0, A | 0, C | 0, g | 0) | 0;
				A = y;
				A = cc(g | 0, A | 0, 15) | 0;
				g = A & -2;
				g = g + C | 0;
				A = C ^ A;
				A = (A | 0) > -1;
				a = g ^ C;
				a = (a | 0) < 0;
				a = A & a;
				C = C >> 31;
				C = C ^ 2147483647;
				g = a ? C : g;
				C = g >> B;
				a = B + -1 | 0;
				a = g >>> a;
				a = a & 1;
				C = a + C | 0;
				C = C & 65535;
				a = d + (D << 1) | 0;
				b[a >> 1] = C;
				E = b[E >> 1] | 0;
				F = tb(E, F) | 0;
				G = d + (G << 1) | 0;
				b[G >> 1] = F;
				l = H;
				return
			}
			n = f + 786432 >> 16;
			if (k) {
				j = n + -1 | 0;
				i = C & 65535;
				f = h;
				h = 1;
				while (1) {
					A = c[E + (h << 2) >> 2] | 0;
					C = c[F + (h << 2) >> 2] | 0;
					z = C + A | 0;
					B = C ^ A;
					g = A >> 31 ^ 2147483647;
					z = (B | 0) > -1 & (z ^ A | 0) < 0 ? g : z;
					b[d + (h << 1) >> 1] = (z >>> j & 1) + (z >> n);
					C = A - C | 0;
					C = ((C ^ A) & B | 0) < 0 ? g : C;
					b[d + (f << 16 >> 16 << 1) >> 1] = (C >>> j & 1) + (C >> n);
					h = h + 1 | 0;
					if ((h | 0) == (i | 0)) break;
					else f = f + -1 << 16 >> 16
				}
			}
			b[d >> 1] = b[d >> 1] >> p;
			B = n;
			F = (4 - o & 65535) + 3 & 65535;
			C = E + (D << 2) | 0;
			C = c[C >> 2] | 0;
			g = (C | 0) < 0;
			g = g << 31 >> 31;
			E = a + (q << 1) | 0;
			a = b[E >> 1] | 0;
			a = a << 16 >> 16;
			A = (a | 0) < 0;
			A = A << 31 >> 31;
			g = bc(a | 0, A | 0, C | 0, g | 0) | 0;
			A = y;
			A = cc(g | 0, A | 0, 15) | 0;
			g = A & -2;
			g = g + C | 0;
			A = C ^ A;
			A = (A | 0) > -1;
			a = g ^ C;
			a = (a | 0) < 0;
			a = A & a;
			C = C >> 31;
			C = C ^ 2147483647;
			g = a ? C : g;
			C = g >> B;
			a = B + -1 | 0;
			a = g >>> a;
			a = a & 1;
			C = a + C | 0;
			C = C & 65535;
			a = d + (D << 1) | 0;
			b[a >> 1] = C;
			E = b[E >> 1] | 0;
			F = tb(E, F) | 0;
			G = d + (G << 1) | 0;
			b[G >> 1] = F;
			l = H;
			return
		}

		function _a(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0;
			g = (d << 16 >> 16) + -1 | 0;
			if (d << 16 >> 16 > 1) {
				f = 0;
				h = 0;
				do {
					b[c + (h << 1) >> 1] = b[a + (h << 1) >> 1] | 0;
					f = f + 1 << 16 >> 16;
					h = f << 16 >> 16
				} while ((g | 0) > (h | 0))
			}
			h = b[a + (g << 1) >> 1] | 0;
			b[c + (g << 1) >> 1] = (h << 17 >> 17 | 0) == (h | 0) ? h << 1 : h >>> 15 ^ 32767;
			if (d << 16 >> 16 <= 0) return;
			a = d & 65535;
			f = 0;
			do {
				h = c + (f << 1) | 0;
				g = b[h >> 1] | 0;
				i = g << 16 >> 16 >> 7 << 16 >> 16;
				d = b[764 + (i << 1) >> 1] | 0;
				g = N((e[764 + (i + 1 << 1) >> 1] | 0) - (d & 65535) << 16 >> 16, g & 127) | 0;
				d = ((g | 0) == 1073741824 ? -1 : g >>> 7 << 16 >> 16) + (d << 16 >> 16) | 0;
				g = d >> 31;
				b[h >> 1] = (d >> 15 | 0) == (g | 0) ? d : g ^ 32767;
				f = f + 1 | 0
			} while ((f | 0) != (a | 0));
			return
		}

		function $a(a) {
			a = a | 0;
			b[a >> 1] = 64;
			b[a + 2 >> 1] = 64;
			b[a + 4 >> 1] = 64;
			b[a + 6 >> 1] = 64;
			b[a + 8 >> 1] = 64;
			return
		}

		function ab(a, c, d, e, f, g) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			f = f | 0;
			g = g | 0;
			var h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0;
			w = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			t = w;
			b[t >> 1] = 0;
			b[t + 2 >> 1] = 0;
			b[t + 4 >> 1] = 0;
			b[t + 6 >> 1] = 0;
			b[t + 8 >> 1] = 0;
			s = b[a + 8 >> 1] | 0;
			q = b[a + 6 >> 1] | 0;
			h = b[c >> 1] | 0;
			i = b[c + 2 >> 1] | 0;
			u = i << 16 >> 16 < h << 16 >> 16 ? i : h;
			v = i << 16 >> 16 > h << 16 >> 16 ? i : h;
			j = b[c + 4 >> 1] | 0;
			u = j << 16 >> 16 < u << 16 >> 16 ? j : u;
			v = j << 16 >> 16 > v << 16 >> 16 ? j : v;
			k = b[c + 6 >> 1] | 0;
			u = k << 16 >> 16 < u << 16 >> 16 ? k : u;
			v = k << 16 >> 16 > v << 16 >> 16 ? k : v;
			n = b[c + 8 >> 1] | 0;
			u = n << 16 >> 16 < u << 16 >> 16 ? n : u;
			v = n << 16 >> 16 > v << 16 >> 16 ? n : v;
			o = b[a >> 1] | 0;
			p = b[a + 2 >> 1] | 0;
			o = p << 16 >> 16 < o << 16 >> 16 ? p : o;
			p = b[a + 4 >> 1] | 0;
			o = p << 16 >> 16 < o << 16 >> 16 ? p : o;
			o = q << 16 >> 16 < o << 16 >> 16 ? q : o;
			p = s << 16 >> 16 < o << 16 >> 16 ? s : o;
			a = u << 16 >> 16;
			x = (v << 16 >> 16) - a | 0;
			r = x >> 31;
			r = ((x >> 15 | 0) == (r | 0) ? x : r ^ 32767) & 65535;
			if (g << 16 >> 16) {
				if (!(r << 16 >> 16 < 10 & p << 16 >> 16 > 8192)) {
					if (!(s << 16 >> 16 > 8192 & q << 16 >> 16 > 8192)) {
						b[t >> 1] = b[c >> 1] | 0;
						b[t + 2 >> 1] = b[c + 2 >> 1] | 0;
						b[t + 4 >> 1] = b[c + 4 >> 1] | 0;
						b[t + 6 >> 1] = b[c + 6 >> 1] | 0;
						b[t + 8 >> 1] = b[c + 8 >> 1] | 0;
						h = b[t >> 1] | 0;
						a = b[t + 2 >> 1] | 0;
						if (h << 16 >> 16 > a << 16 >> 16) {
							b[t + 2 >> 1] = h;
							h = 0
						} else h = 1;
						b[t + (h << 1) >> 1] = a;
						k = t + 4 | 0;
						a = b[k >> 1] | 0;
						h = b[t + 2 >> 1] | 0;
						if (h << 16 >> 16 > a << 16 >> 16) {
							b[t + 4 >> 1] = h;
							h = b[t >> 1] | 0;
							if (h << 16 >> 16 > a << 16 >> 16) {
								b[t + 2 >> 1] = h;
								h = 0
							} else h = 1
						} else h = 2;
						b[t + (h << 1) >> 1] = a;
						j = t + 6 | 0;
						a = b[j >> 1] | 0;
						h = b[t + 4 >> 1] | 0;
						if (h << 16 >> 16 > a << 16 >> 16) {
							b[t + 6 >> 1] = h;
							h = b[t + 2 >> 1] | 0;
							if (h << 16 >> 16 > a << 16 >> 16) {
								b[t + 4 >> 1] = h;
								h = b[t >> 1] | 0;
								if (h << 16 >> 16 > a << 16 >> 16) {
									b[t + 2 >> 1] = h;
									h = 0
								} else h = 1
							} else h = 2
						} else h = 3;
						b[t + (h << 1) >> 1] = a;
						a = t + 8 | 0;
						i = b[a >> 1] | 0;
						h = b[t + 6 >> 1] | 0;
						if (h << 16 >> 16 > i << 16 >> 16) {
							b[t + 8 >> 1] = h;
							h = b[t + 4 >> 1] | 0;
							if (h << 16 >> 16 > i << 16 >> 16) {
								b[t + 6 >> 1] = h;
								h = b[t + 2 >> 1] | 0;
								if (h << 16 >> 16 > i << 16 >> 16) {
									b[t + 4 >> 1] = h;
									h = b[t >> 1] | 0;
									if (h << 16 >> 16 > i << 16 >> 16) {
										b[t + 2 >> 1] = h;
										h = 0
									} else h = 1
								} else h = 2
							} else h = 3
						} else h = 4;
						b[t + (h << 1) >> 1] = i;
						t = b[a >> 1] | 0;
						s = b[k >> 1] | 0;
						x = t - s | 0;
						h = x >> 31;
						h = ((x >> 15 | 0) == (h | 0) ? x : h ^ 32767) & 65535;
						h = N((h << 16 >> 16 < 40 ? h : 40) << 16 >> 16 >> 1 << 16 >> 16, (fb(f) | 0) << 16 >> 16) | 0;
						x = h >> 31;
						s = (b[j >> 1] | 0) + s | 0;
						f = s >> 31;
						t = (((s >> 15 | 0) == (f | 0) ? s : f ^ 32767) << 16 >> 16) + t | 0;
						f = t >> 31;
						f = (((t >> 15 | 0) == (f | 0) ? t : f ^ 32767) << 16 >> 16) * 10923 | 0;
						t = f >> 31;
						x = (((f >> 30 | 0) == (t | 0) ? f >>> 15 : t ^ 32767) << 16 >> 16) + (((h >> 30 | 0) == (x | 0) ?
							h >>> 15 : x ^ 32767) << 16 >> 16) | 0;
						h = x >> 31;
						h = ((x >> 15 | 0) == (h | 0) ? x : h ^ 32767) & 65535
					}
				} else h = b[e >> 1] | 0;
				x = h << 16 >> 16 > v << 16 >> 16 ? v : h;
				b[d >> 1] = x << 16 >> 16 < u << 16 >> 16 ? u : x;
				l = w;
				return
			}
			g = h << 16 >> 16;
			x = g >> 31;
			x = ((g >> 15 | 0) == (x | 0) ? g : x ^ 32767) + (i << 16 >> 16) | 0;
			i = x >> 31;
			i = (((x >> 15 | 0) == (i | 0) ? x : i ^ 32767) << 16 >> 16) + (j << 16 >> 16) | 0;
			j = i >> 31;
			j = (((i >> 15 | 0) == (j | 0) ? i : j ^ 32767) << 16 >> 16) + (k << 16 >> 16) | 0;
			i = j >> 31;
			i = (((j >> 15 | 0) == (i | 0) ? j : i ^ 32767) << 16 >> 16) + (n << 16 >> 16) | 0;
			j = i >> 31;
			j = (((i >> 15 | 0) == (j | 0) ? i : j ^ 32767) << 16 >> 16) * 6554 | 0;
			i = j >> 31;
			i = ((j >> 30 | 0) == (i | 0) ? j >>> 15 : i ^ 32767) & 65535;
			j = b[d >> 1] | 0;
			x = j << 16 >> 16;
			k = x - (h & 65535) | 0;
			n = r << 16 >> 16 < 10;
			if (n ? (a + -5 | 0) < (x | 0) & (x - (v & 65535) << 16 | 0) < 327680 : 0) {
				l = w;
				return
			}
			a = s << 16 >> 16 > 8192 & q << 16 >> 16 > 8192;
			if (a ? ((k << 16) + 655359 | 0) >>> 0 < 1310719 : 0) {
				l = w;
				return
			}
			if ((p << 16 >> 16 < 6554 ? s << 16 >> 16 <= o << 16 >> 16 : 0) ? (j << 16 >> 16 > u << 16 >> 16 ? j <<
					16 >> 16 < v << 16 >> 16 : 0) : 0) {
				l = w;
				return
			}
			if (r << 16 >> 16 < 70 ? (j << 16 >> 16 > u << 16 >> 16 ? j << 16 >> 16 < v << 16 >> 16 : 0) : 0) {
				l = w;
				return
			}
			if (j << 16 >> 16 > i << 16 >> 16 ? j << 16 >> 16 < v << 16 >> 16 : 0) {
				l = w;
				return
			}
			if (!(n & p << 16 >> 16 > 8192 | a)) {
				b[t >> 1] = b[c >> 1] | 0;
				b[t + 2 >> 1] = b[c + 2 >> 1] | 0;
				b[t + 4 >> 1] = b[c + 4 >> 1] | 0;
				b[t + 6 >> 1] = b[c + 6 >> 1] | 0;
				b[t + 8 >> 1] = b[c + 8 >> 1] | 0;
				h = b[t >> 1] | 0;
				a = b[t + 2 >> 1] | 0;
				if (h << 16 >> 16 > a << 16 >> 16) {
					b[t + 2 >> 1] = h;
					h = 0
				} else h = 1;
				b[t + (h << 1) >> 1] = a;
				k = t + 4 | 0;
				a = b[k >> 1] | 0;
				h = b[t + 2 >> 1] | 0;
				if (h << 16 >> 16 > a << 16 >> 16) {
					b[t + 4 >> 1] = h;
					h = b[t >> 1] | 0;
					if (h << 16 >> 16 > a << 16 >> 16) {
						b[t + 2 >> 1] = h;
						h = 0
					} else h = 1
				} else h = 2;
				b[t + (h << 1) >> 1] = a;
				j = t + 6 | 0;
				a = b[j >> 1] | 0;
				h = b[t + 4 >> 1] | 0;
				if (h << 16 >> 16 > a << 16 >> 16) {
					b[t + 6 >> 1] = h;
					h = b[t + 2 >> 1] | 0;
					if (h << 16 >> 16 > a << 16 >> 16) {
						b[t + 4 >> 1] = h;
						h = b[t >> 1] | 0;
						if (h << 16 >> 16 > a << 16 >> 16) {
							b[t + 2 >> 1] = h;
							h = 0
						} else h = 1
					} else h = 2
				} else h = 3;
				b[t + (h << 1) >> 1] = a;
				a = t + 8 | 0;
				i = b[a >> 1] | 0;
				h = b[t + 6 >> 1] | 0;
				if (h << 16 >> 16 > i << 16 >> 16) {
					b[t + 8 >> 1] = h;
					h = b[t + 4 >> 1] | 0;
					if (h << 16 >> 16 > i << 16 >> 16) {
						b[t + 6 >> 1] = h;
						h = b[t + 2 >> 1] | 0;
						if (h << 16 >> 16 > i << 16 >> 16) {
							b[t + 4 >> 1] = h;
							h = b[t >> 1] | 0;
							if (h << 16 >> 16 > i << 16 >> 16) {
								b[t + 2 >> 1] = h;
								h = 0
							} else h = 1
						} else h = 2
					} else h = 3
				} else h = 4;
				b[t + (h << 1) >> 1] = i;
				t = b[a >> 1] | 0;
				s = b[k >> 1] | 0;
				x = t - s | 0;
				h = x >> 31;
				h = ((x >> 15 | 0) == (h | 0) ? x : h ^ 32767) & 65535;
				h = N((h << 16 >> 16 < 40 ? h : 40) << 16 >> 16 >> 1 << 16 >> 16, (fb(f) | 0) << 16 >> 16) | 0;
				x = h >> 31;
				s = (b[j >> 1] | 0) + s | 0;
				f = s >> 31;
				t = (((s >> 15 | 0) == (f | 0) ? s : f ^ 32767) << 16 >> 16) + t | 0;
				f = t >> 31;
				f = (((t >> 15 | 0) == (f | 0) ? t : f ^ 32767) << 16 >> 16) * 10923 | 0;
				t = f >> 31;
				x = (((f >> 30 | 0) == (t | 0) ? f >>> 15 : t ^ 32767) << 16 >> 16) + (((h >> 30 | 0) == (x | 0) ? h >>>
					15 : x ^ 32767) << 16 >> 16) | 0;
				h = x >> 31;
				h = ((x >> 15 | 0) == (h | 0) ? x : h ^ 32767) & 65535
			}
			x = h << 16 >> 16 > v << 16 >> 16 ? v : h;
			b[d >> 1] = x << 16 >> 16 < u << 16 >> 16 ? u : x;
			l = w;
			return
		}

		function bb(b) {
			b = b | 0;
			var c = 0;
			c = b + 60 | 0;
			do {
				a[b >> 0] = 0;
				b = b + 1 | 0
			} while ((b | 0) < (c | 0));
			return
		}

		function cb(c, d, f, g) {
			c = c | 0;
			d = d | 0;
			f = f | 0;
			g = g | 0;
			var h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0;
			h = g;
			i = f;
			j = h + 60 | 0;
			do {
				a[h >> 0] = a[i >> 0] | 0;
				h = h + 1 | 0;
				i = i + 1 | 0
			} while ((h | 0) < (j | 0));
			s = d << 16 >> 16;
			t = s >> 2;
			if ((t | 0) > 0) {
				d = 0;
				v = 0
			} else {
				i = g + (s << 1) | 0;
				h = f;
				j = h + 60 | 0;
				do {
					a[h >> 0] = a[i >> 0] | 0;
					h = h + 1 | 0;
					i = i + 1 | 0
				} while ((h | 0) < (j | 0));
				return
			}
			do {
				u = v << 16 >> 16 << 2;
				r = d << 2;
				k = c + (r << 1) | 0;
				b[g + (r + 30 << 1) >> 1] = b[k >> 1] | 0;
				o = r | 1;
				l = c + (o << 1) | 0;
				b[g + (r + 31 << 1) >> 1] = b[l >> 1] | 0;
				i = r | 2;
				m = c + (i << 1) | 0;
				b[g + (r + 32 << 1) >> 1] = b[m >> 1] | 0;
				h = r | 3;
				n = c + (h << 1) | 0;
				b[g + (r + 33 << 1) >> 1] = b[n >> 1] | 0;
				d = (N((e[k >> 1] | 0) + (e[g + (r << 1) >> 1] | 0) << 16 >> 16, -21) | 0) + 16384 | 0;
				q = b[g + (o << 1) >> 1] | 0;
				j = (N((e[l >> 1] | 0) + (q & 65535) << 16 >> 16, -21) | 0) + 16384 | 0;
				i = (N((e[m >> 1] | 0) + (e[g + (i << 1) >> 1] | 0) << 16 >> 16, -21) | 0) + 16384 | 0;
				h = (N((e[n >> 1] | 0) + (e[g + (h << 1) >> 1] | 0) << 16 >> 16, -21) | 0) + 16384 | 0;
				p = 1;
				do {
					B = b[1022 + (p << 1) >> 1] | 0;
					D = (N(B, q << 16 >> 16) | 0) + d | 0;
					A = b[g + (o + 1 << 1) >> 1] | 0;
					C = (N(B, A) | 0) + j | 0;
					z = b[1022 + (p + 1 << 1) >> 1] | 0;
					A = D + (N(z, A) | 0) | 0;
					D = b[g + (o + 2 << 1) >> 1] | 0;
					C = C + (N(z, D) | 0) | 0;
					y = (N(B, D) | 0) + i | 0;
					x = b[1022 + (p + 2 << 1) >> 1] | 0;
					D = A + (N(x, D) | 0) | 0;
					A = b[g + (o + 3 << 1) >> 1] | 0;
					C = C + (N(A, x) | 0) | 0;
					B = (N(A, B) | 0) + h | 0;
					y = y + (N(A, z) | 0) | 0;
					w = b[1022 + (p + 3 << 1) >> 1] | 0;
					d = D + (N(w, A) | 0) | 0;
					A = b[g + (o + 4 << 1) >> 1] | 0;
					j = C + (N(w, A) | 0) | 0;
					z = B + (N(A, z) | 0) | 0;
					A = y + (N(A, x) | 0) | 0;
					y = b[g + (o + 5 << 1) >> 1] | 0;
					i = A + (N(y, w) | 0) | 0;
					h = z + (N(y, x) | 0) + (N(b[g + (o + 6 << 1) >> 1] | 0, w) | 0) | 0;
					w = (p << 16) + 262144 | 0;
					p = w >> 16;
					o = p + r | 0;
					q = b[g + (o << 1) >> 1] | 0
				} while ((w | 0) < 1900544);
				B = ((b[g + (u + 30 << 1) >> 1] | 0) * 47 | 0) + j | 0;
				C = ((b[g + (u + 31 << 1) >> 1] | 0) * 47 | 0) + i | 0;
				D = ((b[g + (u + 32 << 1) >> 1] | 0) * 47 | 0) + h | 0;
				b[k >> 1] = (((q << 16 >> 16) * 47 | 0) + d | 0) >>> 15;
				b[l >> 1] = B >>> 15;
				b[m >> 1] = C >>> 15;
				b[n >> 1] = D >>> 15;
				v = v + 1 << 16 >> 16;
				d = v << 16 >> 16
			} while ((t | 0) > (d | 0));
			i = g + (s << 1) | 0;
			h = f;
			j = h + 60 | 0;
			do {
				a[h >> 0] = a[i >> 0] | 0;
				h = h + 1 | 0;
				i = i + 1 | 0
			} while ((h | 0) < (j | 0));
			return
		}

		function db(a) {
			a = a | 0;
			var c = 0,
				d = 0,
				e = 0,
				f = 0,
				g = 0,
				h = 0;
			e = b[a + -4 >> 1] | 0;
			g = b[a + -2 >> 1] | 0;
			h = b[a >> 1] | 0;
			d = b[a + 2 >> 1] | 0;
			c = b[a + 4 >> 1] | 0;
			f = g << 16 >> 16 < e << 16 >> 16;
			a = f ? g : e;
			g = f ? e : g;
			e = h << 16 >> 16 < a << 16 >> 16;
			f = e ? h : a;
			a = e ? a : h;
			h = d << 16 >> 16 < f << 16 >> 16;
			e = h ? d : f;
			d = h ? f : d;
			c = c << 16 >> 16 < e << 16 >> 16 ? e : c;
			e = a << 16 >> 16 < g << 16 >> 16;
			f = e ? a : g;
			a = e ? g : a;
			g = d << 16 >> 16 < f << 16 >> 16;
			e = g ? d : f;
			d = g ? f : d;
			c = c << 16 >> 16 < e << 16 >> 16 ? e : c;
			a = d << 16 >> 16 < a << 16 >> 16 ? d : a;
			return (c << 16 >> 16 < a << 16 >> 16 ? c : a) | 0
		}

		function eb(e, f, g, h, i, j) {
			e = e | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			i = i | 0;
			j = j | 0;
			var k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0;
			k = b[h >> 1] | 0;
			l = c[48 + (k << 2) >> 2] | 0;
			fc(f | 0, 0, b[1084 + (k << 1) >> 1] << 1 | 0) | 0;
			k = b[h >> 1] | 0;
			m = b[1084 + (k << 16 >> 16 << 1) >> 1] | 0;
			n = m << 16 >> 16 >> 3;
			if (n << 16 >> 16) {
				q = n + -1 & 65535;
				r = q + 1 | 0;
				q = (q << 3) + 8 | 0;
				p = e;
				o = l;
				while (1) {
					m = d[p >> 0] | 0;
					do switch (((m & 240) + -16 | 0) >>> 4 & 268435455 | 0) {
						case 14: {
							b[f + (b[o >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 2 >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 4 >> 1] << 1) >> 1] = 127;
							k = o + 6 | 0;
							s = 18;
							break
						}
						case 13: {
							b[f + (b[o >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 2 >> 1] << 1) >> 1] = 127;
							k = o + 4 | 0;
							s = 18;
							break
						}
						case 12: {
							b[f + (b[o >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 2 >> 1] << 1) >> 1] = 127;
							k = o + 6 | 0;
							s = 18;
							break
						}
						case 11: {
							b[f + (b[o >> 1] << 1) >> 1] = 127;
							k = o + 2 | 0;
							s = 18;
							break
						}
						case 10: {
							b[f + (b[o >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 4 >> 1] << 1) >> 1] = 127;
							k = o + 6 | 0;
							s = 18;
							break
						}
						case 9: {
							b[f + (b[o >> 1] << 1) >> 1] = 127;
							k = o + 4 | 0;
							s = 18;
							break
						}
						case 8: {
							b[f + (b[o >> 1] << 1) >> 1] = 127;
							k = o + 6 | 0;
							s = 18;
							break
						}
						case 7: {
							k = o;
							s = 18;
							break
						}
						case 6: {
							b[f + (b[o + 2 >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 4 >> 1] << 1) >> 1] = 127;
							k = o + 6 | 0;
							s = 18;
							break
						}
						case 5: {
							b[f + (b[o + 2 >> 1] << 1) >> 1] = 127;
							k = o + 4 | 0;
							s = 18;
							break
						}
						case 4: {
							b[f + (b[o + 2 >> 1] << 1) >> 1] = 127;
							k = o + 6 | 0;
							s = 18;
							break
						}
						case 3: {
							k = o + 2 | 0;
							s = 18;
							break
						}
						case 2: {
							b[f + (b[o + 4 >> 1] << 1) >> 1] = 127;
							k = o + 6 | 0;
							s = 18;
							break
						}
						case 1: {
							k = o + 4 | 0;
							s = 18;
							break
						}
						case 0: {
							k = o + 6 | 0;
							s = 18;
							break
						}
						default: {}
					}
					while (0);
					if ((s | 0) == 18) {
						s = 0;
						b[f + (b[k >> 1] << 1) >> 1] = 127
					}
					k = o + 8 | 0;
					do switch (((m << 4 & 240) + -16 | 0) >>> 4 & 268435455 | 0) {
						case 14: {
							b[f + (b[k >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 10 >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 12 >> 1] << 1) >> 1] = 127;
							k = o + 14 | 0;
							s = 47;
							break
						}
						case 13: {
							b[f + (b[k >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 10 >> 1] << 1) >> 1] = 127;
							k = o + 12 | 0;
							s = 47;
							break
						}
						case 12: {
							b[f + (b[k >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 10 >> 1] << 1) >> 1] = 127;
							k = o + 14 | 0;
							s = 47;
							break
						}
						case 11: {
							b[f + (b[k >> 1] << 1) >> 1] = 127;
							k = o + 10 | 0;
							s = 47;
							break
						}
						case 10: {
							b[f + (b[k >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 12 >> 1] << 1) >> 1] = 127;
							k = o + 14 | 0;
							s = 47;
							break
						}
						case 9: {
							b[f + (b[k >> 1] << 1) >> 1] = 127;
							k = o + 12 | 0;
							s = 47;
							break
						}
						case 8: {
							b[f + (b[k >> 1] << 1) >> 1] = 127;
							k = o + 14 | 0;
							s = 47;
							break
						}
						case 7: {
							s = 47;
							break
						}
						case 6: {
							b[f + (b[o + 10 >> 1] << 1) >> 1] = 127;
							b[f + (b[o + 12 >> 1] << 1) >> 1] = 127;
							k = o + 14 | 0;
							s = 47;
							break
						}
						case 5: {
							b[f + (b[o + 10 >> 1] << 1) >> 1] = 127;
							k = o + 12 | 0;
							s = 47;
							break
						}
						case 4: {
							b[f + (b[o + 10 >> 1] << 1) >> 1] = 127;
							k = o + 14 | 0;
							s = 47;
							break
						}
						case 3: {
							k = o + 10 | 0;
							s = 47;
							break
						}
						case 2: {
							b[f + (b[o + 12 >> 1] << 1) >> 1] = 127;
							k = o + 14 | 0;
							s = 47;
							break
						}
						case 1: {
							k = o + 12 | 0;
							s = 47;
							break
						}
						case 0: {
							k = o + 14 | 0;
							s = 47;
							break
						}
						default: {}
					}
					while (0);
					if ((s | 0) == 47) {
						s = 0;
						b[f + (b[k >> 1] << 1) >> 1] = 127
					}
					n = n + -1 << 16 >> 16;
					if (!(n << 16 >> 16)) break;
					else {
						p = p + 1 | 0;
						o = o + 16 | 0
					}
				}
				k = b[h >> 1] | 0;
				l = l + (q << 1) | 0;
				e = e + r | 0;
				m = b[1084 + (k << 16 >> 16 << 1) >> 1] | 0
			}
			e = a[e >> 0] | 0;
			m = ((m << 16 >> 16 | 0) % 8 | 0) & 65535;
			if (m << 16 >> 16) {
				while (1) {
					k = e & 255;
					if (k & 128 | 0) b[f + (b[l >> 1] << 1) >> 1] = 127;
					e = k << 1 & 255;
					m = m + -1 << 16 >> 16;
					if (!(m << 16 >> 16)) break;
					else l = l + 2 | 0
				}
				k = b[h >> 1] | 0
			}
			switch (k << 16 >> 16 | 0) {
				case 8:
				case 7:
				case 6:
				case 5:
				case 4:
				case 3:
				case 2:
				case 1:
				case 0: {
					b[g >> 1] = i << 24 >> 24 ? 0 : 3;
					j = j + 2 | 0;
					i = b[h >> 1] | 0;
					b[j >> 1] = i;
					return
				}
				case 9: {
					b[g >> 1] = i << 24 >> 24 == 0 ? 6 : e << 24 >> 24 < 0 ? 5 : 4;
					j = j + 2 | 0;
					i = b[j >> 1] | 0;
					b[h >> 1] = i;
					b[j >> 1] = i;
					return
				}
				case 14: {
					b[g >> 1] = 2;
					j = j + 2 | 0;
					i = b[j >> 1] | 0;
					b[h >> 1] = i;
					b[j >> 1] = i;
					return
				}
				case 15: {
					b[g >> 1] = 7;
					j = j + 2 | 0;
					i = b[j >> 1] | 0;
					b[h >> 1] = i;
					b[j >> 1] = i;
					return
				}
				default: {
					b[g >> 1] = 7;
					j = j + 2 | 0;
					i = b[j >> 1] | 0;
					b[h >> 1] = i;
					b[j >> 1] = i;
					return
				}
			}
		}

		function fb(a) {
			a = a | 0;
			var c = 0;
			c = ((b[a >> 1] | 0) * 31821 | 0) + 13849 & 65535;
			b[a >> 1] = c;
			return c | 0
		}

		function gb(a) {
			a = a | 0;
			var b = 0,
				c = 0;
			do
				if ((a | 0) <= 268435455)
					if ((a | 0) <= 16777215) {
						if ((a | 0) > 65535) {
							b = (a | 0) > 1048575 ? 7 : 11;
							break
						}
						if ((a | 0) > 255) {
							b = (a | 0) > 4095 ? 15 : 19;
							break
						} else {
							b = (a | 0) > 15 ? 23 : 27;
							break
						}
					} else b = 3;
			else b = 0; while (0);
			c = b & 65535;
			switch (((a << c & 2013265920) + -134217728 | 0) >>> 27 & 31) {
				case 0: {
					c = c + 3 & 65535;
					return c | 0
				}
				case 1:
				case 2: {
					c = c + 2 & 65535;
					return c | 0
				}
				case 5:
				case 6:
				case 3:
				case 4: {
					c = b + 1 << 16 >> 16;
					return c | 0
				}
				default: {
					c = b;
					return c | 0
				}
			}
			return 0
		}

		function hb(b) {
			b = b | 0;
			var c = 0;
			c = b + 48 | 0;
			do {
				a[b >> 0] = 0;
				b = b + 1 | 0
			} while ((b | 0) < (c | 0));
			return
		}

		function ib(c, d, e, f, g) {
			c = c | 0;
			d = d | 0;
			e = e | 0;
			f = f | 0;
			g = g | 0;
			var h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0;
			h = g;
			i = f;
			j = h + 48 | 0;
			do {
				a[h >> 0] = a[i >> 0] | 0;
				h = h + 1 | 0;
				i = i + 1 | 0
			} while ((h | 0) < (j | 0));
			m = d << 16 >> 16;
			ec(g + 48 | 0, c | 0, m << 1 | 0) | 0;
			d = (m >>> 2) + m | 0;
			l = g + 24 | 0;
			if ((d & 65535) << 16 >> 16 <= 0) {
				i = g + (m << 1) | 0;
				h = f;
				j = h + 48 | 0;
				do {
					a[h >> 0] = a[i >> 0] | 0;
					h = h + 1 | 0;
					i = i + 1 | 0
				} while ((h | 0) < (j | 0));
				return
			}
			k = d & 65535;
			j = e;
			d = 1;
			c = 0;
			while (1) {
				h = d + -1 << 16 >> 16;
				i = l + (c * 6554 >> 13 << 1) | 0;
				if (!(h << 16 >> 16)) {
					d = 5;
					h = b[i >> 1] | 0
				} else {
					d = h;
					h = jb(i, 6914 + ((4 - (h << 16 >> 16) | 0) * 48 | 0) | 0, 4) | 0
				}
				b[j >> 1] = h;
				c = c + 1 | 0;
				if ((c | 0) == (k | 0)) break;
				else j = j + 2 | 0
			}
			i = g + (m << 1) | 0;
			h = f;
			j = h + 48 | 0;
			do {
				a[h >> 0] = a[i >> 0] | 0;
				h = h + 1 | 0;
				i = i + 1 | 0
			} while ((h | 0) < (j | 0));
			return
		}

		function jb(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0,
				h = 0;
			g = d << 16 >> 16;
			g = a + (0 - g << 1) + (0 - (g << 1) << 1) + 2 | 0;
			d = g + 2 | 0;
			a = d + 2 | 0;
			f = a + 2 | 0;
			e = f + 2 | 0;
			g = (N(b[c >> 1] | 0, b[g >> 1] | 0) | 0) + 8192 | 0;
			d = g + (N(b[c + 2 >> 1] | 0, b[d >> 1] | 0) | 0) | 0;
			a = d + (N(b[c + 4 >> 1] | 0, b[a >> 1] | 0) | 0) | 0;
			f = a + (N(b[c + 6 >> 1] | 0, b[f >> 1] | 0) | 0) | 0;
			a = e + 2 | 0;
			d = a + 2 | 0;
			g = d + 2 | 0;
			h = g + 2 | 0;
			e = f + (N(b[c + 8 >> 1] | 0, b[e >> 1] | 0) | 0) | 0;
			a = e + (N(b[c + 10 >> 1] | 0, b[a >> 1] | 0) | 0) | 0;
			d = a + (N(b[c + 12 >> 1] | 0, b[d >> 1] | 0) | 0) | 0;
			g = d + (N(b[c + 14 >> 1] | 0, b[g >> 1] | 0) | 0) | 0;
			d = h + 2 | 0;
			a = d + 2 | 0;
			e = a + 2 | 0;
			f = e + 2 | 0;
			h = g + (N(b[c + 16 >> 1] | 0, b[h >> 1] | 0) | 0) | 0;
			d = h + (N(b[c + 18 >> 1] | 0, b[d >> 1] | 0) | 0) | 0;
			a = d + (N(b[c + 20 >> 1] | 0, b[a >> 1] | 0) | 0) | 0;
			e = a + (N(b[c + 22 >> 1] | 0, b[e >> 1] | 0) | 0) | 0;
			a = f + 2 | 0;
			d = a + 2 | 0;
			h = d + 2 | 0;
			g = h + 2 | 0;
			f = e + (N(b[c + 24 >> 1] | 0, b[f >> 1] | 0) | 0) | 0;
			a = f + (N(b[c + 26 >> 1] | 0, b[a >> 1] | 0) | 0) | 0;
			d = a + (N(b[c + 28 >> 1] | 0, b[d >> 1] | 0) | 0) | 0;
			h = d + (N(b[c + 30 >> 1] | 0, b[h >> 1] | 0) | 0) | 0;
			d = g + 2 | 0;
			a = d + 2 | 0;
			f = a + 2 | 0;
			e = f + 2 | 0;
			g = h + (N(b[c + 32 >> 1] | 0, b[g >> 1] | 0) | 0) | 0;
			d = g + (N(b[c + 34 >> 1] | 0, b[d >> 1] | 0) | 0) | 0;
			a = d + (N(b[c + 36 >> 1] | 0, b[a >> 1] | 0) | 0) | 0;
			f = a + (N(b[c + 38 >> 1] | 0, b[f >> 1] | 0) | 0) | 0;
			a = e + 2 | 0;
			d = a + 2 | 0;
			e = f + (N(b[c + 40 >> 1] | 0, b[e >> 1] | 0) | 0) | 0;
			a = e + (N(b[c + 42 >> 1] | 0, b[a >> 1] | 0) | 0) | 0;
			a = a + (N(b[c + 44 >> 1] | 0, b[d >> 1] | 0) | 0) | 0;
			d = a + (N(b[c + 46 >> 1] | 0, b[d + 2 >> 1] | 0) | 0) | 0;
			c = d << 2;
			return ((c >> 2 | 0) == (d | 0) ? c : d >> 31 ^ 2147418112) >>> 16 & 65535 | 0
		}

		function kb(a, c, d, e, f, g) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			f = f | 0;
			g = g | 0;
			var h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0;
			r = f + 4 | 0;
			fc(g | 0, 0, 256) | 0;
			n = c << 16 >> 16 < 14746;
			l = f + 12 | 0;
			o = b[l >> 1] | 0;
			b[f + 14 >> 1] = o;
			p = f + 10 | 0;
			i = b[p >> 1] | 0;
			b[l >> 1] = i;
			l = f + 8 | 0;
			j = b[l >> 1] | 0;
			b[p >> 1] = j;
			p = f + 6 | 0;
			k = b[p >> 1] | 0;
			b[l >> 1] = k;
			l = b[r >> 1] | 0;
			b[p >> 1] = l;
			p = f + 2 | 0;
			m = c << 16 >> 16 < 9830;
			h = m ? 0 : n ? 1 : 2;
			b[r >> 1] = c;
			c = b[p >> 1] | 0;
			r = (a << 16 >> 16) - c | 0;
			q = r >> 31;
			if ((((r >> 15 | 0) == (q | 0) ? r : q ^ 32767) & 65535) << 16 >> 16 > (((c << 17 >> 17 | 0) == (c | 0) ?
					c << 1 : c >>> 15 ^ 32767) & 65535) << 16 >> 16) h = h + (n & 1) << 16 >> 16;
			else {
				h = ((((((m & 1) + (l << 16 >> 16 < 9830 & 1) << 16 >> 16) + (k << 16 >> 16 < 9830 & 1) << 16 >> 16) + (
					j << 16 >> 16 < 9830 & 1) << 16 >> 16) + (i << 16 >> 16 < 9830 & 1) << 16 >> 16) + (o << 16 >>
					16 < 9830 & 1) & 65535) > 2 ? 0 : h;
				h = h + ((((b[f >> 1] | 0) + 1 | 0) < (h & 65535 | 0)) << 31 >> 31) << 16 >> 16
			}
			b[p >> 1] = a;
			b[f >> 1] = h;
			k = (h & 65535) + (e & 65535) << 16;
			switch (k >> 16 | 0) {
				case 0: {
					j = 0;
					do {
						i = d + (j << 1) | 0;
						h = b[i >> 1] | 0;
						a: do
							if (h << 16 >> 16) {
								c = 0;
								while (1) {
									r = g + (c + j << 1) | 0;
									f = b[r >> 1] | 0;
									f = ((sb(h, b[7106 + (c << 1) >> 1] | 0) | 0) << 16 >> 16) + (f << 16 >> 16) | 0;
									q = f >> 31;
									b[r >> 1] = (f >> 15 | 0) == (q | 0) ? f : q ^ 32767;
									c = c + 1 | 0;
									if ((c | 0) == 64) break a;
									h = b[i >> 1] | 0
								}
							}
						while (0);
						j = j + 1 | 0
					} while ((j | 0) != 64);
					break
				}
				case 1: {
					j = 0;
					do {
						i = d + (j << 1) | 0;
						h = b[i >> 1] | 0;
						b: do
							if (h << 16 >> 16) {
								c = 0;
								while (1) {
									r = g + (c + j << 1) | 0;
									f = b[r >> 1] | 0;
									f = ((sb(h, b[7234 + (c << 1) >> 1] | 0) | 0) << 16 >> 16) + (f << 16 >> 16) | 0;
									q = f >> 31;
									b[r >> 1] = (f >> 15 | 0) == (q | 0) ? f : q ^ 32767;
									c = c + 1 | 0;
									if ((c | 0) == 64) break b;
									h = b[i >> 1] | 0
								}
							}
						while (0);
						j = j + 1 | 0
					} while ((j | 0) != 64);
					break
				}
				default: {}
			}
			if ((k | 0) < 131072) h = 0;
			else return;
			do {
				q = (b[g + (h + 64 << 1) >> 1] | 0) + (b[g + (h << 1) >> 1] | 0) | 0;
				r = q >> 31;
				b[d + (h << 1) >> 1] = (q >> 15 | 0) == (r | 0) ? q : r ^ 32767;
				h = h + 1 | 0
			} while ((h | 0) != 64);
			return
		}

		function lb(a, c, d, f) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			f = f | 0;
			var g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0;
			if (c << 16 >> 16 >= f << 16 >> 16) return;
			h = c << 16 >> 16;
			g = d << 16 >> 16;
			d = f << 16 >> 16;
			c = h;
			do {
				f = a + (c << 1) | 0;
				j = e[f >> 1] << 16;
				k = N(b[a + (c - h << 1) >> 1] | 0, g) | 0;
				k = (k | 0) == 1073741824 ? 2147483647 : k << 1;
				i = k + j | 0;
				i = (k ^ j | 0) > -1 & (i ^ j | 0) < 0 ? j >> 31 ^ 2147483647 : i;
				b[f >> 1] = (i | 0) == 2147483647 ? 32767 : (i + 32768 | 0) >>> 16 & 65535;
				c = c + 1 | 0
			} while ((c | 0) != (d | 0));
			return
		}

		function mb(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0;
			c = a + (0 - (c << 16 >> 16) << 1) | 0;
			m = 0 - d << 16 >> 16;
			l = m << 16 >> 16 < 0;
			c = (l ? c + -2 | 0 : c) + -30 | 0;
			m = 3 - ((l ? (m & 65535) + 4 | 0 : 0 - (d & 65535) | 0) << 16 >> 16) | 0;
			l = e << 16 >> 16;
			j = l >> 2;
			if ((j | 0) > 0) {
				i = 0;
				d = c;
				k = 0;
				do {
					e = 8192;
					f = 8192;
					g = 8192;
					h = 8192;
					c = 0;
					while (1) {
						r = c + 1 | 0;
						p = c + 2 | 0;
						u = b[7362 + (m << 6) + (c << 1) >> 1] | 0;
						v = (N(u, b[d + (c << 1) >> 1] | 0) | 0) + e | 0;
						o = b[d + (r << 1) >> 1] | 0;
						t = (N(u, o) | 0) + f | 0;
						r = b[7362 + (m << 6) + (r << 1) >> 1] | 0;
						o = v + (N(r, o) | 0) | 0;
						v = b[d + (p << 1) >> 1] | 0;
						t = t + (N(r, v) | 0) | 0;
						q = (N(u, v) | 0) + h | 0;
						p = b[7362 + (m << 6) + (p << 1) >> 1] | 0;
						v = o + (N(p, v) | 0) | 0;
						o = c + 3 | 0;
						n = c + 4 | 0;
						s = b[d + (o << 1) >> 1] | 0;
						u = (N(s, u) | 0) + g | 0;
						q = q + (N(s, r) | 0) | 0;
						t = t + (N(s, p) | 0) | 0;
						o = b[7362 + (m << 6) + (o << 1) >> 1] | 0;
						e = v + (N(o, s) | 0) | 0;
						s = b[d + (n << 1) >> 1] | 0;
						r = u + (N(s, r) | 0) | 0;
						f = t + (N(o, s) | 0) | 0;
						s = q + (N(s, p) | 0) | 0;
						q = b[d + (c + 5 << 1) >> 1] | 0;
						h = s + (N(q, o) | 0) | 0;
						g = r + (N(q, p) | 0) + (N(b[d + (c + 6 << 1) >> 1] | 0, o) | 0) | 0;
						c = n << 16;
						if ((c | 0) >= 2097152) break;
						else c = c >> 16
					}
					v = k << 2;
					b[a + (v << 1) >> 1] = e >>> 14;
					b[a + ((v | 1) << 1) >> 1] = f >>> 14;
					b[a + ((v | 2) << 1) >> 1] = h >>> 14;
					b[a + ((v | 3) << 1) >> 1] = g >>> 14;
					d = d + 8 | 0;
					i = i + 1 << 16 >> 16;
					k = i << 16 >> 16
				} while ((j | 0) > (k | 0));
				c = k << 2
			} else {
				d = c;
				c = 0
			}
			if (!(l & 1)) return;
			v = (N(b[7362 + (m << 6) >> 1] | 0, b[d >> 1] | 0) | 0) + 8192 | 0;
			v = v + (N(b[7362 + (m << 6) + 2 >> 1] | 0, b[d + 2 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 4 >> 1] | 0, b[d + 4 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 6 >> 1] | 0, b[d + 6 >> 1] | 0) | 0) | 0;
			v = (N(b[7362 + (m << 6) + 8 >> 1] | 0, b[d + 8 >> 1] | 0) | 0) + v | 0;
			v = v + (N(b[7362 + (m << 6) + 10 >> 1] | 0, b[d + 10 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 12 >> 1] | 0, b[d + 12 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 14 >> 1] | 0, b[d + 14 >> 1] | 0) | 0) | 0;
			v = (N(b[7362 + (m << 6) + 16 >> 1] | 0, b[d + 16 >> 1] | 0) | 0) + v | 0;
			v = v + (N(b[7362 + (m << 6) + 18 >> 1] | 0, b[d + 18 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 20 >> 1] | 0, b[d + 20 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 22 >> 1] | 0, b[d + 22 >> 1] | 0) | 0) | 0;
			v = (N(b[7362 + (m << 6) + 24 >> 1] | 0, b[d + 24 >> 1] | 0) | 0) + v | 0;
			v = v + (N(b[7362 + (m << 6) + 26 >> 1] | 0, b[d + 26 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 28 >> 1] | 0, b[d + 28 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 30 >> 1] | 0, b[d + 30 >> 1] | 0) | 0) | 0;
			v = (N(b[7362 + (m << 6) + 32 >> 1] | 0, b[d + 32 >> 1] | 0) | 0) + v | 0;
			v = v + (N(b[7362 + (m << 6) + 34 >> 1] | 0, b[d + 34 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 36 >> 1] | 0, b[d + 36 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 38 >> 1] | 0, b[d + 38 >> 1] | 0) | 0) | 0;
			v = (N(b[7362 + (m << 6) + 40 >> 1] | 0, b[d + 40 >> 1] | 0) | 0) + v | 0;
			v = v + (N(b[7362 + (m << 6) + 42 >> 1] | 0, b[d + 42 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 44 >> 1] | 0, b[d + 44 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 46 >> 1] | 0, b[d + 46 >> 1] | 0) | 0) | 0;
			v = (N(b[7362 + (m << 6) + 48 >> 1] | 0, b[d + 48 >> 1] | 0) | 0) + v | 0;
			v = v + (N(b[7362 + (m << 6) + 50 >> 1] | 0, b[d + 50 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 52 >> 1] | 0, b[d + 52 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 54 >> 1] | 0, b[d + 54 >> 1] | 0) | 0) | 0;
			v = (N(b[7362 + (m << 6) + 56 >> 1] | 0, b[d + 56 >> 1] | 0) | 0) + v | 0;
			v = v + (N(b[7362 + (m << 6) + 58 >> 1] | 0, b[d + 58 >> 1] | 0) | 0) | 0;
			v = v + (N(b[7362 + (m << 6) + 60 >> 1] | 0, b[d + 60 >> 1] | 0) | 0) | 0;
			b[a + (c << 1) >> 1] = (v + (N(b[7362 + (m << 6) + 62 >> 1] | 0, b[d + 62 >> 1] | 0) | 0) | 0) >>> 14;
			return
		}

		function nb(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0;
			f = (d & 65535) + 65535 | 0;
			d = f & 65535;
			if (!(d << 16 >> 16)) return;
			g = c << 16 >> 16;
			c = d;
			d = f << 16 >> 16;
			while (1) {
				f = a + (d << 1) | 0;
				h = e[f >> 1] << 16;
				i = N(b[a + (d + -1 << 1) >> 1] | 0, g) | 0;
				i = (i | 0) == 1073741824 ? 2147483647 : i << 1;
				d = h - i | 0;
				d = ((d ^ h) & (i ^ h) | 0) < 0 ? h >> 31 ^ 2147483647 : d;
				b[f >> 1] = (d | 0) == 2147483647 ? 32767 : (d + 32768 | 0) >>> 16 & 65535;
				d = c + -1 << 16 >> 16;
				if (!(d << 16 >> 16)) break;
				else {
					c = d;
					d = d << 16 >> 16
				}
			}
			return
		}

		function ob(a, b, d) {
			a = a | 0;
			b = b | 0;
			d = d | 0;
			c[d >> 2] = b + 1520;
			Ja(b + 1150 | 0, 7618) | 0;
			pb(b, 1);
			c[a >> 2] = b;
			return
		}

		function pb(d, e) {
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0;
			fc(d | 0, 0, 496) | 0;
			g = d + 656 | 0;
			c[g >> 2] = 0;
			c[g + 4 >> 2] = 0;
			c[g + 8 >> 2] = 0;
			c[g + 12 >> 2] = 0;
			c[g + 16 >> 2] = 0;
			c[g + 20 >> 2] = 0;
			c[g + 24 >> 2] = 0;
			c[g + 28 >> 2] = 0;
			b[d + 1056 >> 1] = 0;
			b[d + 1054 >> 1] = 64;
			b[d + 1148 >> 1] = 1;
			c[d + 700 >> 2] = 0;
			b[d + 688 >> 1] = 0;
			g = d + 1116 | 0;
			c[g >> 2] = 0;
			c[g + 4 >> 2] = 0;
			c[g + 8 >> 2] = 0;
			c[g + 12 >> 2] = 0;
			b[d + 690 >> 1] = 8;
			b[d + 698 >> 1] = 8;
			b[d + 696 >> 1] = 8;
			b[d + 694 >> 1] = 8;
			b[d + 692 >> 1] = 8;
			if (!(e << 16 >> 16)) return;
			Ga(d + 1068 | 0);
			hb(d + 782 | 0);
			wa(d + 870 | 0);
			bb(d + 990 | 0);
			Sa(d + 770 | 0);
			Qa(d + 1132 | 0);
			$a(d + 1058 | 0);
			f = d + 496 | 0;
			e = 7650;
			g = f + 32 | 0;
			do {
				a[f >> 0] = a[e >> 0] | 0;
				f = f + 1 | 0;
				e = e + 1 | 0
			} while ((f | 0) < (g | 0));
			f = d + 528 | 0;
			e = 7618;
			g = f + 32 | 0;
			do {
				a[f >> 0] = a[e >> 0] | 0;
				f = f + 1 | 0;
				e = e + 1 | 0
			} while ((f | 0) < (g | 0));
			f = d + 560 | 0;
			e = 7618;
			g = f + 32 | 0;
			do {
				a[f >> 0] = a[e >> 0] | 0;
				f = f + 1 | 0;
				e = e + 1 | 0
			} while ((f | 0) < (g | 0));
			f = d + 592 | 0;
			e = 7618;
			g = f + 32 | 0;
			do {
				a[f >> 0] = a[e >> 0] | 0;
				f = f + 1 | 0;
				e = e + 1 | 0
			} while ((f | 0) < (g | 0));
			f = d + 624 | 0;
			e = 7618;
			g = f + 32 | 0;
			do {
				a[f >> 0] = a[e >> 0] | 0;
				f = f + 1 | 0;
				e = e + 1 | 0
			} while ((f | 0) < (g | 0));
			b[d + 768 >> 1] = 0;
			b[d + 1050 >> 1] = 21845;
			b[d + 1052 >> 1] = 21845;
			b[d + 1114 >> 1] = 21845;
			b[d + 1146 >> 1] = 0;
			b[d + 1144 >> 1] = 0;
			f = d + 830 | 0;
			g = f + 40 | 0;
			do {
				b[f >> 1] = 0;
				f = f + 2 | 0
			} while ((f | 0) < (g | 0));
			e = d + 1150 | 0;
			f = d + 704 | 0;
			g = f + 64 | 0;
			do {
				c[f >> 2] = 0;
				f = f + 4 | 0
			} while ((f | 0) < (g | 0));
			Ja(e, 7618) | 0;
			b[d + 1518 >> 1] = 0;
			return
		}

		function qb() {
			return 4392
		}

		function rb(d, f, g, h, i, j, k) {
			d = d | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			i = i | 0;
			j = j | 0;
			k = k | 0;
			var n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0,
				E = 0,
				F = 0,
				G = 0,
				H = 0,
				I = 0,
				J = 0,
				K = 0,
				L = 0,
				M = 0,
				O = 0,
				P = 0,
				Q = 0,
				R = 0,
				S = 0,
				T = 0,
				U = 0,
				V = 0,
				X = 0,
				Y = 0,
				Z = 0,
				_ = 0,
				$ = 0,
				aa = 0,
				ba = 0,
				ca = 0,
				da = 0,
				ea = 0,
				fa = 0,
				ga = 0,
				ha = 0,
				ia = 0,
				ja = 0,
				ka = 0,
				la = 0,
				ma = 0,
				na = 0,
				oa = 0,
				pa = 0,
				qa = 0,
				ra = 0,
				sa = 0,
				ta = 0,
				ua = 0,
				wa = 0,
				xa = 0,
				Aa = 0,
				Ba = 0,
				Ca = 0,
				Da = 0,
				Ea = 0,
				Fa = 0,
				Ga = 0,
				Ia = 0,
				Ja = 0,
				La = 0,
				Qa = 0,
				Ra = 0,
				Sa = 0,
				Ta = 0,
				Ua = 0,
				Va = 0,
				Wa = 0,
				Ya = 0,
				$a = 0,
				bb = 0,
				cb = 0,
				db = 0;
			db = l;
			l = l + 32 | 0;
			if ((l | 0) >= (m | 0)) W(32);
			Ta = db;
			Ua = db + 4 | 0;
			Va = db + 16 | 0;
			Ra = db + 10 | 0;
			Sa = db + 8 | 0;
			c[Ta >> 2] = f;
			o = k + 692 | 0;
			v = k + 1702 | 0;
			r = k + 1838 | 0;
			Ya = k + 1870 | 0;
			$a = k + 1902 | 0;
			Ia = k + 1934 | 0;
			Ja = k + 2062 | 0;
			Wa = k + 2190 | 0;
			bb = k + 2702 | 0;
			s = d << 16 >> 16;
			cb = b[7682 + (s << 1) >> 1] | 0;
			b[h >> 1] = 320;
			Ga = i + 1150 | 0;
			q = Na(Ga, j) | 0;
			n = q << 16 >> 16 != 0;
			if (n) Ka(Ga, Wa, q, Ya, Ta) | 0;
			switch (j << 16 >> 16) {
				case 1:
				case 3: {
					f = 0;
					t = 5;
					break
				}
				case 2:
				case 7: {
					f = 1;
					t = 5;
					break
				}
				default: {
					Fa = i + 1146 | 0;
					f = 0;
					Qa = 0;
					h = b[Fa >> 1] >> 1;
					Ea = 0
				}
			}
			if ((t | 0) == 5) {
				Fa = i + 1146 | 0;
				Ea = (b[Fa >> 1] | 0) + 1 | 0;
				h = Ea & 65535;
				b[Fa >> 1] = h;
				Qa = 1;
				h = (Ea << 16 | 0) > 393216 ? 6 : h;
				Ea = 1
			}
			b[Fa >> 1] = h;
			La = i + 1510 | 0;
			switch (b[La >> 1] | 0) {
				case 1: {
					h = 0;
					t = 9;
					break
				}
				case 2: {
					h = 1;
					t = 9;
					break
				}
				default: {}
			}
			if ((t | 0) == 9) {
				b[Fa >> 1] = 5;
				b[i + 1144 >> 1] = h
			}
			do
				if (q << 16 >> 16 == 0 ? (p = Pa(Ta) | 0, Qa << 16 >> 16 == 0) : 0) {
					h = i + 1518 | 0;
					if (!(p << 16 >> 16)) {
						Ca = (b[h >> 1] | 0) + 1 | 0;
						Da = Ca >> 31;
						b[h >> 1] = (Ca >> 15 | 0) == (Da | 0) ? Ca : Da ^ 32767;
						break
					} else {
						b[h >> 1] = 0;
						break
					}
				} while (0);
			if (n) {
				_a(Ya, r, 16);
				Za(r, v, 16, 1);
				h = i + 528 | 0;
				u = $a;
				j = h;
				t = u + 32 | 0;
				do {
					a[u >> 0] = a[j >> 0] | 0;
					u = u + 1 | 0;
					j = j + 1 | 0
				} while ((u | 0) < (t | 0));
				f = 0;
				do {
					Ua = b[$a + (f << 1) >> 1] | 0;
					Ua = (Ua * 18021 | 0) == 1073741824 ? 2147483647 : Ua * 36042 | 0;
					Ta = b[Ya + (f << 1) >> 1] | 0;
					Ta = (Ta * 14746 | 0) == 1073741824 ? 2147483647 : Ta * 29492 | 0;
					Va = Ua + Ta | 0;
					Va = (Ua ^ Ta | 0) > -1 & (Va ^ Ua | 0) < 0 ? Ua >> 31 ^ 2147483647 : Va;
					b[bb + (f << 1) >> 1] = (Va | 0) == 2147483647 ? 32767 : (Va + 32768 | 0) >>> 16 & 65535;
					f = f + 1 | 0
				} while ((f | 0) != 16);
				Hb(v, Wa, 0, g, 1, bb, cb, q, i, Qa, k);
				f = 0;
				do {
					Va = b[$a + (f << 1) >> 1] | 0;
					Va = (Va * 6553 | 0) == 1073741824 ? 2147483647 : Va * 13106 | 0;
					Ua = b[Ya + (f << 1) >> 1] | 0;
					Ua = (Ua * 26214 | 0) == 1073741824 ? 2147483647 : Ua * 52428 | 0;
					Wa = Va + Ua | 0;
					Wa = (Va ^ Ua | 0) > -1 & (Wa ^ Va | 0) < 0 ? Va >> 31 ^ 2147483647 : Wa;
					b[bb + (f << 1) >> 1] = (Wa | 0) == 2147483647 ? 32767 : (Wa + 32768 | 0) >>> 16 & 65535;
					f = f + 1 | 0
				} while ((f | 0) != 16);
				Hb(v, k + 2318 | 0, 0, g + 160 | 0, 1, bb, cb, q, i, Qa, k);
				f = 0;
				do {
					Va = b[$a + (f << 1) >> 1] | 0;
					Va = (Va * 1310 | 0) == 1073741824 ? 2147483647 : Va * 2620 | 0;
					Ua = b[Ya + (f << 1) >> 1] | 0;
					Ua = (Ua * 31457 | 0) == 1073741824 ? 2147483647 : Ua * 62914 | 0;
					Wa = Va + Ua | 0;
					Wa = (Va ^ Ua | 0) > -1 & (Wa ^ Va | 0) < 0 ? Va >> 31 ^ 2147483647 : Wa;
					b[bb + (f << 1) >> 1] = (Wa | 0) == 2147483647 ? 32767 : (Wa + 32768 | 0) >>> 16 & 65535;
					f = f + 1 | 0
				} while ((f | 0) != 16);
				Hb(v, k + 2446 | 0, 0, g + 320 | 0, 1, bb, cb, q, i, Qa, k);
				u = b[Ya >> 1] | 0;
				b[bb >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1872 >> 1] | 0;
				b[k + 2704 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1874 >> 1] | 0;
				b[k + 2706 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1876 >> 1] | 0;
				b[k + 2708 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1878 >> 1] | 0;
				b[k + 2710 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1880 >> 1] | 0;
				b[k + 2712 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1882 >> 1] | 0;
				b[k + 2714 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1884 >> 1] | 0;
				b[k + 2716 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1886 >> 1] | 0;
				b[k + 2718 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1888 >> 1] | 0;
				b[k + 2720 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1890 >> 1] | 0;
				b[k + 2722 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1892 >> 1] | 0;
				b[k + 2724 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1894 >> 1] | 0;
				b[k + 2726 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1896 >> 1] | 0;
				b[k + 2728 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1898 >> 1] | 0;
				b[k + 2730 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				u = b[k + 1900 >> 1] | 0;
				b[k + 2732 >> 1] = (u * 32767 | 0) == 1073741824 ? 32767 : ((u * 65534 | 0) + 32768 | 0) >>> 16 & 65535;
				Hb(v, k + 2574 | 0, 0, g + 480 | 0, 1, bb, cb, q, i, Qa, k);
				fc(i | 0, 0, 496) | 0;
				u = i + 656 | 0;
				c[u >> 2] = 0;
				c[u + 4 >> 2] = 0;
				c[u + 8 >> 2] = 0;
				c[u + 12 >> 2] = 0;
				c[u + 16 >> 2] = 0;
				c[u + 20 >> 2] = 0;
				c[u + 24 >> 2] = 0;
				c[u + 28 >> 2] = 0;
				b[i + 1056 >> 1] = 0;
				b[i + 1054 >> 1] = 64;
				b[i + 1148 >> 1] = 1;
				c[i + 700 >> 2] = 0;
				b[i + 688 >> 1] = 0;
				u = i + 1116 | 0;
				c[u >> 2] = 0;
				c[u + 4 >> 2] = 0;
				c[u + 8 >> 2] = 0;
				c[u + 12 >> 2] = 0;
				b[i + 690 >> 1] = 8;
				b[i + 698 >> 1] = 8;
				b[i + 696 >> 1] = 8;
				b[i + 694 >> 1] = 8;
				b[i + 692 >> 1] = 8;
				u = h;
				j = Ya;
				t = u + 32 | 0;
				do {
					a[u >> 0] = a[j >> 0] | 0;
					u = u + 1 | 0;
					j = j + 1 | 0
				} while ((u | 0) < (t | 0));
				b[i + 1144 >> 1] = Qa;
				b[La >> 1] = q;
				l = db;
				return 0
			}
			ec(o | 0, i | 0, 496) | 0;
			Ca = k + 1188 | 0;
			b[Va >> 1] = Oa(8, Ta) | 0;
			Da = Va + 2 | 0;
			b[Da >> 1] = Oa(8, Ta) | 0;
			switch (d << 16 >> 16) {
				case 0:
				case 9: {
					Ba = Oa(14, Ta) | 0;
					b[Va + 6 >> 1] = Ba & 127;
					b[Va + 4 >> 1] = Ba << 16 >> 16 >> 7;
					b[Va + 8 >> 1] = Oa(6, Ta) | 0;
					Fb(Va, Ya, i + 656 | 0, i + 528 | 0, i + 560 | 0, Qa, 1);
					break
				}
				default: {
					b[Va + 4 >> 1] = Oa(6, Ta) | 0;
					b[Va + 6 >> 1] = Oa(7, Ta) | 0;
					b[Va + 8 >> 1] = Oa(7, Ta) | 0;
					b[Va + 10 >> 1] = Oa(5, Ta) | 0;
					b[Va + 12 >> 1] = Oa(5, Ta) | 0;
					Db(Va, Ya, i + 656 | 0, i + 528 | 0, i + 560 | 0, Qa, 1)
				}
			}
			_a(Ya, r, 16);
			h = i + 1148 | 0;
			if (!(b[h >> 1] | 0)) {
				j = r;
				h = i + 496 | 0
			} else {
				b[h >> 1] = 0;
				h = i + 496 | 0;
				u = h;
				j = r;
				t = u + 32 | 0;
				do {
					a[u >> 0] = a[j >> 0] | 0;
					u = u + 1 | 0;
					j = j + 1 | 0
				} while ((u | 0) < (t | 0));
				j = r
			}
			Xa(h, r, 7702, v);
			u = h;
			t = u + 32 | 0;
			do {
				a[u >> 0] = a[j >> 0] | 0;
				u = u + 1 | 0;
				j = j + 1 | 0
			} while ((u | 0) < (t | 0));
			n = i + 528 | 0;
			h = 0;
			j = 0;
			do {
				Ba = (b[Ya + (j << 1) >> 1] | 0) - (b[n + (j << 1) >> 1] | 0) | 0;
				Aa = Ba >> 31;
				Aa = ((Ba >> 15 | 0) == (Aa | 0) ? Ba : Aa ^ 32767) << 16 >> 16;
				Aa = N(Aa, Aa) | 0;
				Aa = (Aa | 0) == 1073741824 ? 2147483647 : Aa << 1;
				Ba = Aa + h | 0;
				h = (Aa ^ h | 0) > -1 & (Ba ^ h | 0) < 0 ? h >> 31 ^ 2147483647 : Ba;
				j = j + 1 | 0
			} while ((j | 0) != 15);
			o = h << 8;
			h = (((o >> 8 | 0) == (h | 0) ? o : h >> 31 ^ 2147418112) >> 16) * 26214 | 0;
			o = h >> 31;
			o = 20480 - ((h >> 30 | 0) == (o | 0) ? h >>> 15 : o ^ 32767) | 0;
			h = o << 16;
			h = (o << 17 >> 17 | 0) == (h >> 16 | 0) ? o << 1 : h >> 31 ^ 32767;
			o = (h & 65535) << 16 >> 16 > 0;
			u = $a;
			j = n;
			t = u + 32 | 0;
			do {
				a[u >> 0] = a[j >> 0] | 0;
				u = u + 1 | 0;
				j = j + 1 | 0
			} while ((u | 0) < (t | 0));
			u = n;
			j = Ya;
			t = u + 32 | 0;
			do {
				a[u >> 0] = a[j >> 0] | 0;
				u = u + 1 | 0;
				j = j + 1 | 0
			} while ((u | 0) < (t | 0));
			na = (s + -2 | 0) >>> 0 > 6;
			oa = i + 1102 | 0;
			pa = i + 1058 | 0;
			qa = i + 1054 | 0;
			ra = i + 1114 | 0;
			sa = f << 16 >> 16 == 0;
			ma = sa ^ 1;
			la = ma & 1;
			ta = (s + -3 | 0) >>> 0 > 5;
			ua = (s + -4 | 0) >>> 0 > 4;
			wa = Va + 4 | 0;
			xa = Va + 6 | 0;
			Aa = (s + -5 | 0) >>> 0 > 3;
			Ba = (s + -6 | 0) >>> 0 > 2;
			X = (s + -7 | 0) >>> 0 > 1;
			Y = Va + 8 | 0;
			Z = Va + 10 | 0;
			_ = Va + 12 | 0;
			$ = Va + 14 | 0;
			aa = i + 688 | 0;
			ba = i + 1144 | 0;
			ca = i + 1518 | 0;
			da = i + 1068 | 0;
			ea = i + 692 | 0;
			fa = i + 690 | 0;
			ga = Qa << 16 >> 16 == 0;
			ha = i + 696 | 0;
			ia = i + 698 | 0;
			ja = i + 694 | 0;
			ka = i + 1116 | 0;
			E = o ? h & 65535 : 0;
			F = i + 700 | 0;
			G = k + 1936 | 0;
			H = k + 2060 | 0;
			I = k + 2058 | 0;
			J = k + 2316 | 0;
			K = i + 830 | 0;
			L = d << 16 >> 16 == 8;
			M = i + 1056 | 0;
			O = i + 1050 | 0;
			P = i + 694 | 0;
			Q = i + 696 | 0;
			R = i + 698 | 0;
			S = i + 1064 | 0;
			T = i + 1066 | 0;
			U = i + 1062 | 0;
			V = i + 1060 | 0;
			D = v;
			h = 0;
			B = 0;
			C = 0;
			while (1) {
				a: do switch (B << 16 >> 16) {
						case 128:
							switch (d << 16 >> 16) {
								case 0:
								case 9:
									if (na) {
										t = 43;
										break a
									} else {
										t = 44;
										break a
									}
								default:
									if (na) {
										t = 33;
										break a
									} else {
										t = 36;
										break a
									}
							}
						case 0: {
							if (na) t = 33;
							else t = 36;
							break
						}
						default:
							if (na) t = 43;
							else t = 44
					}
					while (0);
					do
						if ((t | 0) == 33) {
							A = Oa(8, Ta) | 0;
							h = A << 16 >> 16;
							if (A << 16 >> 16 < 116) {
								n = (h >>> 1) + 34 | 0;
								j = n & 65535;
								b[Ra >> 1] = j;
								n = (n << 16 >> 16) + -34 | 0;
								t = n >> 31;
								t = (n >> 15 | 0) == (t | 0) ? n : t ^ 32767;
								n = t << 16;
								h = h - (((t << 17 >> 17 | 0) == (n >> 16 | 0) ? t << 1 : n >> 31 ^ 32767) << 16 >> 16) | 0;
								n = h >> 31;
								n = (h >> 15 | 0) == (n | 0) ? h : n ^ 32767;
								h = n << 16;
								h = ((n << 17 >> 17 | 0) == (h >> 16 | 0) ? n << 1 : h >> 31 ^ 32767) & 65535;
								n = 1;
								t = 41;
								break
							} else {
								h = h + -24 | 0;
								j = h >> 31;
								j = ((h >> 15 | 0) == (j | 0) ? h : j ^ 32767) & 65535;
								b[Ra >> 1] = j;
								h = 0;
								n = 1;
								t = 41;
								break
							}
						} else if ((t | 0) == 36) {
					h = Oa(9, Ta) | 0;
					j = h << 16 >> 16;
					if (h << 16 >> 16 < 376) {
						n = (j >>> 2) + 34 | 0;
						t = n & 65535;
						b[Ra >> 1] = t;
						n = (n << 16 >> 16) + -34 | 0;
						h = n >> 31;
						h = (n >> 15 | 0) == (h | 0) ? n : h ^ 32767;
						n = h << 16;
						n = j - (((h << 18 >> 18 | 0) == (n >> 16 | 0) ? h << 2 : n >> 31 ^ 32767) << 16 >> 16) | 0;
						h = n >> 31;
						h = ((n >> 15 | 0) == (h | 0) ? n : h ^ 32767) & 65535;
						n = 0;
						j = t;
						t = 41;
						break
					}
					if (h << 16 >> 16 < 440) {
						n = (j << 16) + -24641536 | 0;
						h = n >> 17;
						j = h + 128 & 65535;
						b[Ra >> 1] = j;
						h = (n >> 16) - (h << 1) | 0;
						n = h >> 31;
						n = (h >> 15 | 0) == (n | 0) ? h : n ^ 32767;
						h = n << 16;
						h = ((n << 17 >> 17 | 0) == (h >> 16 | 0) ? n << 1 : h >> 31 ^ 32767) & 65535;
						n = 0;
						t = 41;
						break
					} else {
						h = j + -280 | 0;
						j = h >> 31;
						j = ((h >> 15 | 0) == (j | 0) ? h : j ^ 32767) & 65535;
						b[Ra >> 1] = j;
						h = 0;
						n = 0;
						t = 41;
						break
					}
				} else if ((t | 0) == 43) {
					t = 0;
					z = (Oa(5, Ta) | 0) << 16 >> 16;
					A = z >>> 1;
					j = A + (h & 65535) & 65535;
					b[Ra >> 1] = j;
					n = A << 16;
					n = z - (((A << 17 >> 17 | 0) == (n >> 16 | 0) ? z & 65534 : n >> 31 ^ 32767) << 16 >> 16) | 0;
					z = n >> 31;
					z = (n >> 15 | 0) == (z | 0) ? n : z ^ 32767;
					n = z << 16;
					A = h;
					h = ((z << 17 >> 17 | 0) == (n >> 16 | 0) ? z << 1 : n >> 31 ^ 32767) & 65535;
					n = 1
				} else if ((t | 0) == 44) {
					t = 0;
					n = (Oa(6, Ta) | 0) << 16 >> 16;
					A = n >>> 2;
					j = A + (h & 65535) & 65535;
					b[Ra >> 1] = j;
					z = A << 16;
					z = n - (((A << 18 >> 18 | 0) == (z >> 16 | 0) ? n & 65532 : z >> 31 ^ 32767) << 16 >> 16) | 0;
					n = z >> 31;
					A = h;
					h = ((z >> 15 | 0) == (n | 0) ? z : n ^ 32767) & 65535;
					n = 0
				}
				while (0);
				if ((t | 0) == 41) {
					A = (j & 65535) + 65528 | 0;
					A = (A << 16 | 0) < 2228224 ? 34 : A & 65535;
					A = (((A & 65535) << 16) + 983040 | 0) > 15138816 ? 216 : A
				}
				if (Ea) {
					ab(oa, pa, Ra, qa, ra, f);
					p = 0;
					h = b[Ra >> 1] | 0
				} else {
					p = h;
					h = j
				}
				x = Ca + (C << 1) | 0;mb(x, h, p, 65);
				if (n | ma) h = la;
				else h = Pa(Ta) | 0;
				if (!(h << 16 >> 16)) {
					h = C + -1 | 0;
					j = C + 1 | 0;
					o = 0;
					do {
						b[Ia + (o << 1) >> 1] = (((((b[Ca + (j + o << 1) >> 1] | 0) + (b[Ca + (h + o << 1) >> 1] | 0) | 0) *
							5898 | 0) + ((b[Ca + (o + C << 1) >> 1] | 0) * 20972 | 0) << 1) + 32768 | 0) >>> 16;
						o = o + 1 | 0
					} while ((o | 0) != 64);
					u = x;
					j = Ia;
					t = u + 128 | 0;
					do {
						a[u >> 0] = a[j >> 0] | 0;
						u = u + 1 | 0;
						j = j + 1 | 0
					} while ((u | 0) < (t | 0))
				}
				b: do
					if (sa) {
						switch (d << 16 >> 16) {
							case 0:
							case 9: {
								z = Oa(12, Ta) | 0;
								b[Va >> 1] = z;
								ya(z, Ia);
								break b
							}
							default: {}
						}
						if (n) {
							b[Va >> 1] = Oa(5, Ta) | 0;
							b[Da >> 1] = Oa(5, Ta) | 0;
							b[wa >> 1] = Oa(5, Ta) | 0;
							b[xa >> 1] = Oa(5, Ta) | 0;
							za(Va, 20, Ia);
							break
						}
						if (ta) {
							b[Va >> 1] = Oa(9, Ta) | 0;
							b[Da >> 1] = Oa(9, Ta) | 0;
							b[wa >> 1] = Oa(9, Ta) | 0;
							b[xa >> 1] = Oa(9, Ta) | 0;
							za(Va, 36, Ia);
							break
						}
						if (ua) {
							b[Va >> 1] = Oa(13, Ta) | 0;
							b[Da >> 1] = Oa(13, Ta) | 0;
							b[wa >> 1] = Oa(9, Ta) | 0;
							b[xa >> 1] = Oa(9, Ta) | 0;
							za(Va, 44, Ia);
							break
						}
						if (Aa) {
							b[Va >> 1] = Oa(13, Ta) | 0;
							b[Da >> 1] = Oa(13, Ta) | 0;
							b[wa >> 1] = Oa(13, Ta) | 0;
							b[xa >> 1] = Oa(13, Ta) | 0;
							za(Va, 52, Ia);
							break
						}
						if (Ba) {
							b[Va >> 1] = Oa(2, Ta) | 0;
							b[Da >> 1] = Oa(2, Ta) | 0;
							b[wa >> 1] = Oa(2, Ta) | 0;
							b[xa >> 1] = Oa(2, Ta) | 0;
							b[Y >> 1] = Oa(14, Ta) | 0;
							b[Z >> 1] = Oa(14, Ta) | 0;
							b[_ >> 1] = Oa(14, Ta) | 0;
							b[$ >> 1] = Oa(14, Ta) | 0;
							za(Va, 64, Ia);
							break
						}
						if (X) {
							b[Va >> 1] = Oa(10, Ta) | 0;
							b[Da >> 1] = Oa(10, Ta) | 0;
							b[wa >> 1] = Oa(2, Ta) | 0;
							b[xa >> 1] = Oa(2, Ta) | 0;
							b[Y >> 1] = Oa(10, Ta) | 0;
							b[Z >> 1] = Oa(10, Ta) | 0;
							b[_ >> 1] = Oa(14, Ta) | 0;
							b[$ >> 1] = Oa(14, Ta) | 0;
							za(Va, 72, Ia);
							break
						} else {
							b[Va >> 1] = Oa(11, Ta) | 0;
							b[Da >> 1] = Oa(11, Ta) | 0;
							b[wa >> 1] = Oa(11, Ta) | 0;
							b[xa >> 1] = Oa(11, Ta) | 0;
							b[Y >> 1] = Oa(11, Ta) | 0;
							b[Z >> 1] = Oa(11, Ta) | 0;
							b[_ >> 1] = Oa(11, Ta) | 0;
							b[$ >> 1] = Oa(11, Ta) | 0;
							za(Va, 88, Ia);
							break
						}
					} else {
						h = 0;
						do {
							b[Ia + (h << 1) >> 1] = (fb(O) | 0) << 16 >> 16 >> 3;
							h = h + 1 | 0
						} while ((h | 0) != 64)
					}while (0);nb(Ia, b[aa >> 1] | 0, 64);lb(Ia, (b[Ra >> 1] | 0) + (p << 16 >> 16 > 2 & 1) << 16 >> 16,
					27853, 64);
				if (n) {
					z = Oa(6, Ta) | 0;
					Ha(z, 6, Ia, 64, Sa, Ua, Qa, b[ba >> 1] | 0, b[Fa >> 1] | 0, f, b[ca >> 1] | 0, da)
				} else {
					z = Oa(7, Ta) | 0;
					Ha(z, 7, Ia, 64, Sa, Ua, Qa, b[ba >> 1] | 0, b[Fa >> 1] | 0, f, b[ca >> 1] | 0, da)
				}
				z = b[ea >> 1] | 0;p = b[P >> 1] | 0;z = p << 16 >> 16 < z << 16 >> 16 ? p : z;p = b[Q >> 1] | 0;z =
				p << 16 >> 16 < z << 16 >> 16 ? p : z;p = b[R >> 1] | 0;z = p << 16 >> 16 < z << 16 >> 16 ? p : z;p =
				z << 16 >> 16 < 8 ? z : 8;h = c[Ua >> 2] | 0;
				if (z << 16 >> 16 > 0 & (h | 0) < 134217728) {
					j = 0;
					do {
						h = h << 1;
						j = (j & 65535) + 1 | 0;
						o = j & 65535
					} while ((h | 0) < 134217728 ? p << 16 >> 16 > o << 16 >> 16 : 0)
				} else o = 0;s = (h | 0) == 2147483647 ? 32767 : (h + 32768 | 0) >>> 16 & 65535;z = o & 65535;Gb(x + -
					496 | 0, 312, z - (e[fa >> 1] | 0) & 65535);b[fa >> 1] = o;
				if (ga) {
					b[T >> 1] = b[S >> 1] | 0;
					b[S >> 1] = b[U >> 1] | 0;
					b[U >> 1] = b[V >> 1] | 0;
					b[V >> 1] = b[pa >> 1] | 0;
					h = b[Ra >> 1] | 0;
					b[pa >> 1] = h;
					b[qa >> 1] = h;
					b[M >> 1] = 0;
					h = 63
				} else h = 63;
				while (1) {
					w = b[Ca + (h + C << 1) >> 1] | 0;
					b[Wa + (h << 1) >> 1] = (((w << 16 >> 16 != 32767 & 1) << 2) + (w << 16 >> 16) | 0) >>> 3;
					if ((h | 0) > 0) h = h + -1 | 0;
					else break
				}
				r = b[Sa >> 1] | 0;
				if (n) {
					q = r << 16 >> 16;
					h = (q << 17 >> 17 | 0) == (q | 0) ? q << 1 : q >>> 15 ^ 32767;
					p = h & 65535;
					if (p << 16 >> 16 > 16384) {
						h = h << 16 >> 16;
						j = 0;
						do {
							v = N(h, b[Wa + (j << 1) >> 1] | 0) | 0;
							w = v >> 31;
							w = N(((v >> 30 | 0) == (w | 0) ? v >>> 15 : w ^ 32767) << 16 >> 16, q) | 0;
							b[Ja + (j << 1) >> 1] = (w | 0) == 1073741824 ? 16384 : ((w << 1 >> 1) + 32768 | 0) >>> 16 &
							65535;
							j = j + 1 | 0
						} while ((j | 0) != 64);
						w = p
					} else w = p
				} else w = 0;v = (Ib(Wa, -3, r, Ia, s, 64) | 0) << 16 >> 16;b[aa >> 1] = (v >>> 2) + 8192;u = Wa;j =
				x;t = u + 128 | 0;do {
					a[u >> 0] = a[j >> 0] | 0;
					u = u + 1 | 0;
					j = j + 1 | 0
				} while ((u | 0) < (t | 0));h = s << 16 >> 16;j = b[Sa >> 1] | 0;q = 1;p = 0;do {
					t = N(b[Ia + (p << 1) >> 1] | 0, h) | 0;
					t = (t | 0) == 1073741824 ? 2147483647 : t << 1;
					u = t << 5;
					t = (u >> 5 | 0) == (t | 0) ? u : t >> 31 ^ 2147483647;
					u = Ca + (p + C << 1) | 0;
					s = N(j, b[u >> 1] | 0) | 0;
					s = (s | 0) == 1073741824 ? 2147483647 : s << 1;
					x = t + s | 0;
					x = (t ^ s | 0) > -1 & (x ^ t | 0) < 0 ? t >> 31 ^ 2147483647 : x;
					t = x << 1;
					x = (t >> 1 | 0) == (x | 0) ? t : x >> 31 ^ 2147483647;
					x = (x | 0) == 2147483647 ? 32767 : (x + 32768 | 0) >>> 16 & 65535;
					b[u >> 1] = x;
					x = (x & 65535) - ((x & 65535) >>> 15 & 65535) << 16;
					q = x >> 16 ^ x >> 31 | q;
					p = p + 1 | 0
				} while ((p | 0) != 64);r = o << 16 >> 16;u = ((((gb(q) | 0) & 65535) << 16) + -1048576 >> 16) + r |
				0;x = u >> 31;b[ia >> 1] = b[ha >> 1] | 0;b[ha >> 1] = b[ja >> 1] | 0;b[ja >> 1] = b[ea >> 1] | 0;b[
					ea >> 1] = ((u >> 15 | 0) == (x | 0) ? u : x ^ 32767) + 65535;
				switch (d << 16 >> 16) {
					case 0:
					case 9: {
						h = 0;
						break
					}
					default:
						h = n ? 1 : 2
				}
				kb((c[Ua >> 2] | 0) >>> 16 & 65535, b[Sa >> 1] | 0, Ia, h, ka, k);p = N(16384 - (v >>> 1) << 16 >> 16,
					E) | 0;j = p >> 31;j = (p >> 30 | 0) == (j | 0) ? p >>> 15 : j ^ 32767;p = c[Ua >> 2] | 0;h = c[F >>
					2] | 0;q = ((p | 0) < 0) << 31 >> 31;
				if ((p | 0) < (h | 0)) {
					x = bc(p | 0, q | 0, 408027136, 0) | 0;
					x = cc(x | 0, y | 0, 31) | 0;
					x = (x & -2) + p | 0;
					h = (x | 0) > (h | 0) ? h : x
				} else {
					x = bc(p | 0, q | 0, 1804599296, 0) | 0;
					x = cc(x | 0, y | 0, 31) | 0;
					x = x & -2;
					h = (x | 0) < (h | 0) ? h : x
				}
				c[F >> 2] = h;u = j << 16;x = 32767 - j << 16;x = bc(p | 0, q | 0, x | 0, ((x | 0) < 0) << 31 >> 31 |
				0) | 0;x = cc(x | 0, y | 0, 31) | 0;t = y;u = bc(h | 0, ((h | 0) < 0) << 31 >> 31 | 0, u | 0, ((u | 0) <
					0) << 31 >> 31 | 0) | 0;u = cc(u | 0, y | 0, 31) | 0;h = (x & -2) + (u & -2) | 0;h = (x ^ u | 0) > -
				1 & (h ^ x | 0) < 0 ? x >> 31 ^ 2147483647 : h;c[Ua >> 2] = h;
				if (o << 16 >> 16 > 0) {
					x = h << r;
					h = (x >> r | 0) == (h | 0) ? x : h >> 31 ^ 2147483647
				} else h = h >> (0 - r & 15);r = b[Ia >> 1] | 0;j = (r & 65535) << 16;p = b[G >> 1] | 0;t = (v >>> 3 <<
					16) + 268435456 >> 16;v = N(t, p << 16 >> 16) | 0;v = (v | 0) == 1073741824 ? 2147483647 : v << 1;x =
				j - v | 0;x = ((x ^ j) & (v ^ j) | 0) < 0 ? j >> 31 ^ 2147483647 : x;h = (h | 0) == 2147483647 ? 32767 :
				h + 32768 >> 16;x = N((x | 0) == 2147483647 ? 32767 : x + 32768 >> 16, h) | 0;x = (x | 0) ==
				1073741824 ? 2147483647 : x << 1;j = x << 5;x = (j >> 5 | 0) == (x | 0) ? j : x >> 31 ^ 2147483647;j =
				b[Sa >> 1] | 0;v = N(j, b[Wa >> 1] | 0) | 0;v = (v | 0) == 1073741824 ? 2147483647 : v << 1;s = x + v |
				0;s = (x ^ v | 0) > -1 & (s ^ x | 0) < 0 ? x >> 31 ^ 2147483647 : s;x = s << 1;s = (x >> 1 | 0) == (s |
					0) ? x : s >> 31 ^ 2147483647;b[Wa >> 1] = (s | 0) == 2147483647 ? 32767 : (s + 32768 | 0) >>> 16 &
					65535;s = 1;
				while (1) {
					v = (p & 65535) << 16;
					x = s;
					s = s + 1 | 0;
					q = b[Ia + (s << 1) >> 1] | 0;
					r = N((r & 65535) + (q & 65535) << 16 >> 16, t) | 0;
					r = (r | 0) == 1073741824 ? 2147483647 : r << 1;
					u = v - r | 0;
					u = ((u ^ v) & (r ^ v) | 0) < 0 ? v >> 31 ^ 2147483647 : u;
					u = N((u | 0) == 2147483647 ? 32767 : u + 32768 >> 16, h) | 0;
					u = (u | 0) == 1073741824 ? 2147483647 : u << 1;
					r = u << 5;
					u = (r >> 5 | 0) == (u | 0) ? r : u >> 31 ^ 2147483647;
					x = Wa + (x << 1) | 0;
					r = N(j, b[x >> 1] | 0) | 0;
					r = (r | 0) == 1073741824 ? 2147483647 : r << 1;
					v = u + r | 0;
					v = (u ^ r | 0) > -1 & (v ^ u | 0) < 0 ? u >> 31 ^ 2147483647 : v;
					u = v << 1;
					v = (u >> 1 | 0) == (v | 0) ? u : v >> 31 ^ 2147483647;
					b[x >> 1] = (v | 0) == 2147483647 ? 32767 : (v + 32768 | 0) >>> 16 & 65535;
					if ((s | 0) == 63) break;
					else {
						r = p;
						p = q
					}
				}
				u = e[H >> 1] << 16;x = N(t, b[I >> 1] | 0) | 0;x = (x | 0) == 1073741824 ? 2147483647 : x << 1;v = u -
				x | 0;v = ((v ^ u) & (x ^ u) | 0) < 0 ? u >> 31 ^ 2147483647 : v;v = N((v | 0) == 2147483647 ? 32767 :
					v + 32768 >> 16, h) | 0;v = (v | 0) == 1073741824 ? 2147483647 : v << 1;u = v << 5;v = (u >> 5 | 0) ==
				(v | 0) ? u : v >> 31 ^ 2147483647;u = N(j, b[J >> 1] | 0) | 0;u = (u | 0) == 1073741824 ? 2147483647 :
				u << 1;x = v + u | 0;x = (v ^ u | 0) > -1 & (x ^ v | 0) < 0 ? v >> 31 ^ 2147483647 : x;v = x << 1;x = (
					v >> 1 | 0) == (x | 0) ? v : x >> 31 ^ 2147483647;b[J >> 1] = (x | 0) == 2147483647 ? 32767 : (x +
					32768 | 0) >>> 16 & 65535;
				if (n & w << 16 >> 16 > 16384) {
					h = 0;
					do {
						x = Ja + (h << 1) | 0;
						v = (b[Wa + (h << 1) >> 1] | 0) + (b[x >> 1] | 0) | 0;
						w = v >> 31;
						b[x >> 1] = (v >> 15 | 0) == (w | 0) ? v : w ^ 32767;
						h = h + 1 | 0
					} while ((h | 0) != 64);
					va(Wa, Ja, 64);
					u = Wa;
					j = Ja;
					t = u + 128 | 0;
					do {
						a[u >> 0] = a[j >> 0] | 0;
						u = u + 1 | 0;
						j = j + 1 | 0
					} while ((u | 0) < (t | 0))
				}
				switch (d << 16 >> 16) {
					case 0:
					case 9: {
						h = b[7702 + (B << 16 >> 16 >> 6 << 16 >> 16 << 1) >> 1] | 0;
						n = 32767 - h | 0;
						j = n >> 31;
						j = ((n >> 15 | 0) == (j | 0) ? n : j ^ 32767) << 16 >> 16;
						n = 0;
						do {
							x = N(j, b[$a + (n << 1) >> 1] | 0) | 0;
							x = (x | 0) == 1073741824 ? 2147483647 : x << 1;
							w = N(b[Ya + (n << 1) >> 1] | 0, h) | 0;
							w = (w | 0) == 1073741824 ? 2147483647 : w << 1;
							B = x + w | 0;
							B = (x ^ w | 0) > -1 & (B ^ x | 0) < 0 ? x >> 31 ^ 2147483647 : B;
							b[bb + (n << 1) >> 1] = (B | 0) == 2147483647 ? 32767 : (B + 32768 | 0) >>> 16 & 65535;
							n = n + 1 | 0
						} while ((n | 0) != 16);
						break
					}
					default: {
						B = K;
						x = B;
						b[x >> 1] = 0;
						b[x + 2 >> 1] = 0 >>> 16;
						B = B + 4 | 0;
						b[B >> 1] = 0;
						b[B + 2 >> 1] = 0 >>> 16
					}
				}
				if (L) h = Oa(4, Ta) | 0;
				else h = 0;Hb(D, Wa, o, g + ((C >> 2) + C << 1) | 0, h, bb, cb, 0, i, Qa, k);j = C + 64 | 0;B = j &
				65535;
				if (B << 16 >> 16 >= 256) break;
				else {
					D = D + 34 | 0;
					h = A;
					C = j << 16 >> 16
				}
			}
			ec(i | 0, k + 1204 | 0, 496) | 0;
			Gb(Ca, 256, 0 - z & 65535);
			Ma(Ga, Ya, Ca);
			b[La >> 1] = 0;
			b[ba >> 1] = Qa;
			l = db;
			return 0
		}

		function sb(a, b) {
			a = a | 0;
			b = b | 0;
			a = (N(b << 16 >> 16, a << 16 >> 16) | 0) + 16384 | 0;
			b = a >> 31;
			return ((a >> 30 | 0) == (b | 0) ? a >>> 15 : b ^ 32767) & 65535 | 0
		}

		function tb(a, b) {
			a = a | 0;
			b = b | 0;
			var c = 0,
				d = 0;
			a = a << 16 >> 16;
			c = b << 16 >> 16;
			d = a >> (c & 15) & 65535;
			if (!(b << 16 >> 16)) return d | 0;
			else return ((1 << c + -1 & a | 0) != 0 & 1) + d << 16 >> 16 | 0;
			return 0
		}

		function ub(a, b) {
			a = a | 0;
			b = b | 0;
			var c = 0,
				d = 0,
				e = 0,
				f = 0,
				g = 0;
			c = b << 16 >> 16;
			if (a << 16 >> 16 < 1 ? 1 : a << 16 >> 16 > b << 16 >> 16) {
				c = 0;
				return c | 0
			}
			if (a << 16 >> 16 == b << 16 >> 16) {
				c = 32767;
				return c | 0
			}
			b = c << 1;
			d = c << 2;
			a = a << 16 >> 16 << 3;
			e = (a | 0) < (d | 0);
			a = a - (e ? 0 : d) | 0;
			e = e ? 0 : 4;
			g = (a | 0) < (b | 0);
			a = a - (g ? 0 : b) | 0;
			f = (a | 0) < (c | 0);
			e = ((g ? e : e | 2) | (f ^ 1) & 1) << 3;
			f = a - (f ? 0 : c) << 3;
			a = (f | 0) < (d | 0);
			f = f - (a ? 0 : d) | 0;
			e = a ? e : e | 4;
			a = (f | 0) < (b | 0);
			f = f - (a ? 0 : b) | 0;
			g = (f | 0) < (c | 0);
			e = ((a ? e : e | 2) | (g ^ 1) & 1) << 16 >> 13;
			g = f - (g ? 0 : c) << 3;
			f = (g | 0) < (d | 0);
			g = g - (f ? 0 : d) | 0;
			e = f ? e : e & 65528 | 4;
			f = (g | 0) < (b | 0);
			g = g - (f ? 0 : b) | 0;
			a = (g | 0) < (c | 0);
			e = ((f ? e : e | 2) | (a ^ 1) & 1) << 16 >> 13;
			a = g - (a ? 0 : c) << 3;
			g = (a | 0) < (d | 0);
			a = a - (g ? 0 : d) | 0;
			e = g ? e : e & 65528 | 4;
			g = (a | 0) < (b | 0);
			a = a - (g ? 0 : b) | 0;
			f = (a | 0) < (c | 0);
			e = ((g ? e : e | 2) | (f ^ 1) & 1) << 16 >> 13;
			f = a - (f ? 0 : c) << 3;
			a = (f | 0) < (d | 0);
			d = f - (a ? 0 : d) | 0;
			e = a ? e : e & 65528 | 4;
			a = (d | 0) < (b | 0);
			c = ((a ? e : e | 2) | (d - (a ? 0 : b) | 0) >= (c | 0)) & 65535;
			return c | 0
		}

		function vb(a) {
			a = a | 0;
			var b = 0,
				c = 0,
				d = 0,
				f = 0,
				g = 0;
			b = gb(a) | 0;
			a = a << (b << 16 >> 16);
			do
				if ((a | 0) < 1) {
					a = 0;
					b = 2147483647
				} else {
					f = a >>> (1 - b & 1);
					a = ((31 - (b & 65535) << 16 >> 16) + 131071 | 0) >>> 1;
					c = 0 - a | 0;
					b = (f >> 25 << 16) + -1048576 >> 16;
					g = e[7842 + (b << 1) >> 1] | 0;
					d = g << 16;
					f = N(g - (e[7842 + (b + 1 << 1) >> 1] | 0) << 16 >> 16, f >>> 10 & 32767) | 0;
					f = (f | 0) == 1073741824 ? 2147483647 : f << 1;
					b = d - f | 0;
					b = ((b ^ d) & (f ^ d) | 0) < 0 ? d >> 31 ^ 2147483647 : b;
					if ((a & 65535) << 16 >> 16 != -32768) {
						a = c << 16 >> 16;
						if ((c & 65535) << 16 >> 16 <= 0) break
					} else a = 32767;
					g = b << a;
					g = (g >> a | 0) == (b | 0) ? g : b >> 31 ^ 2147483647;
					return g | 0
				} while (0);
			g = b >> (0 - a & 15);
			return g | 0
		}

		function wb(a, d) {
			a = a | 0;
			d = d | 0;
			var f = 0,
				g = 0,
				h = 0;
			f = c[a >> 2] | 0;
			if ((f | 0) < 1) {
				b[d >> 1] = 0;
				g = 2147483647;
				c[a >> 2] = g;
				return
			}
			g = b[d >> 1] | 0;
			if (g & 1) {
				f = f >>> 1;
				c[a >> 2] = f
			}
			g = ((g << 16 >> 16) + 131071 | 0) >>> 1;
			b[d >> 1] = (g & 65535) << 16 >> 16 == -32768 ? 32767 : 0 - g & 65535;
			g = (f >> 25 << 16) + -1048576 >> 16;
			h = e[7842 + (g << 1) >> 1] | 0;
			d = h << 16;
			c[a >> 2] = d;
			f = N(h - (e[7842 + (g + 1 << 1) >> 1] | 0) << 16 >> 16, f >>> 10 & 32767) | 0;
			f = (f | 0) == 1073741824 ? 2147483647 : f << 1;
			g = d - f | 0;
			g = ((g ^ d) & (f ^ d) | 0) < 0 ? d >> 31 ^ 2147483647 : g;
			c[a >> 2] = g;
			return
		}

		function xb(a, c) {
			a = a | 0;
			c = c | 0;
			var d = 0,
				f = 0;
			d = c << 16 >> 16 >> 10 << 16 >> 16;
			f = b[7710 + (d << 1) >> 1] | 0;
			d = (f << 15) - (N(f - (e[7710 + (d + 1 << 1) >> 1] | 0) << 16 >> 16, c << 16 >> 16 << 5 & 32736) | 0) |
			0;
			a = 29 - (a & 65535) | 0;
			c = a << 16 >> 16;
			return ((a & 65535) << 16 >> 16 == 0 ? d : (d >>> (c + -1 | 0) & 1) + (d >> c) | 0) | 0
		}

		function yb(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0;
			f = d << 16 >> 16 >> 3;
			if (!(f << 16 >> 16)) {
				f = 1;
				c = gb(f) | 0;
				c = c << 16 >> 16;
				f = f << c;
				c = 30 - c | 0;
				c = c & 65535;
				b[e >> 1] = c;
				return f | 0
			} else d = 1;
			while (1) {
				h = N(b[c >> 1] | 0, b[a >> 1] | 0) | 0;
				h = (h | 0) == 1073741824 ? 2147483647 : h << 1;
				g = h + d | 0;
				g = (h ^ d | 0) > -1 & (g ^ d | 0) < 0 ? d >> 31 ^ 2147483647 : g;
				h = N(b[c + 2 >> 1] | 0, b[a + 2 >> 1] | 0) | 0;
				h = (h | 0) == 1073741824 ? 2147483647 : h << 1;
				d = g + h | 0;
				d = (g ^ h | 0) > -1 & (d ^ g | 0) < 0 ? g >> 31 ^ 2147483647 : d;
				g = N(b[c + 4 >> 1] | 0, b[a + 4 >> 1] | 0) | 0;
				g = (g | 0) == 1073741824 ? 2147483647 : g << 1;
				h = d + g | 0;
				h = (d ^ g | 0) > -1 & (h ^ d | 0) < 0 ? d >> 31 ^ 2147483647 : h;
				d = N(b[c + 6 >> 1] | 0, b[a + 6 >> 1] | 0) | 0;
				d = (d | 0) == 1073741824 ? 2147483647 : d << 1;
				g = h + d | 0;
				g = (h ^ d | 0) > -1 & (g ^ h | 0) < 0 ? h >> 31 ^ 2147483647 : g;
				h = N(b[c + 8 >> 1] | 0, b[a + 8 >> 1] | 0) | 0;
				h = (h | 0) == 1073741824 ? 2147483647 : h << 1;
				d = g + h | 0;
				d = (g ^ h | 0) > -1 & (d ^ g | 0) < 0 ? g >> 31 ^ 2147483647 : d;
				g = N(b[c + 10 >> 1] | 0, b[a + 10 >> 1] | 0) | 0;
				g = (g | 0) == 1073741824 ? 2147483647 : g << 1;
				h = d + g | 0;
				h = (d ^ g | 0) > -1 & (h ^ d | 0) < 0 ? d >> 31 ^ 2147483647 : h;
				d = N(b[c + 12 >> 1] | 0, b[a + 12 >> 1] | 0) | 0;
				d = (d | 0) == 1073741824 ? 2147483647 : d << 1;
				g = h + d | 0;
				g = (h ^ d | 0) > -1 & (g ^ h | 0) < 0 ? h >> 31 ^ 2147483647 : g;
				h = N(b[c + 14 >> 1] | 0, b[a + 14 >> 1] | 0) | 0;
				h = (h | 0) == 1073741824 ? 2147483647 : h << 1;
				d = g + h | 0;
				d = (g ^ h | 0) > -1 & (d ^ g | 0) < 0 ? g >> 31 ^ 2147483647 : d;
				f = f + -1 << 16 >> 16;
				if (!(f << 16 >> 16)) break;
				else {
					a = a + 16 | 0;
					c = c + 16 | 0
				}
			}
			g = gb(d) | 0;
			g = g << 16 >> 16;
			h = d << g;
			g = 30 - g | 0;
			g = g & 65535;
			b[e >> 1] = g;
			return h | 0
		}

		function zb(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var f = 0,
				g = 0,
				h = 0;
			g = gb(a) | 0;
			f = g << 16 >> 16;
			if (g << 16 >> 16 > 0) {
				h = a << f;
				a = (h >> f | 0) == (a | 0) ? h : a >> 31 ^ 2147483647
			} else a = a >> (0 - f & 15);
			if ((a | 0) < 1) {
				b[c >> 1] = 0;
				h = 0;
				b[d >> 1] = h;
				return
			} else {
				b[c >> 1] = 30 - (g & 65535);
				f = (a >>> 25 << 16) + -2097152 >> 16;
				g = b[7776 + (f << 1) >> 1] | 0;
				c = g << 16;
				f = N(g - (e[7776 + (f + 1 << 1) >> 1] | 0) << 16 >> 16, a >>> 10 & 32767) | 0;
				f = (f | 0) == 1073741824 ? 2147483647 : f << 1;
				h = c - f | 0;
				h = (((h ^ c) & (f ^ c) | 0) < 0 ? g >> 15 ^ 2147418112 : h) >>> 16 & 65535;
				b[d >> 1] = h;
				return
			}
		}

		function Ab(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			b[c >> 1] = a >>> 16;
			b[d >> 1] = a >>> 1 & 32767;
			return
		}

		function Bb(a, b, c, d) {
			a = a | 0;
			b = b | 0;
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0;
			f = a << 16 >> 16;
			a = c << 16 >> 16;
			e = N(a, f) | 0;
			e = (e | 0) == 1073741824 ? 2147483647 : e << 1;
			c = N(d << 16 >> 16, f) | 0;
			d = c >> 31;
			d = ((c >> 30 | 0) == (d | 0) ? c >>> 15 : d ^ 32767) << 16 >> 15;
			c = d + e | 0;
			c = (d ^ e | 0) > -1 & (c ^ e | 0) < 0 ? e >> 31 ^ 2147483647 : c;
			d = N(a, b << 16 >> 16) | 0;
			b = d >> 31;
			b = ((d >> 30 | 0) == (b | 0) ? d >>> 15 : b ^ 32767) << 16 >> 15;
			d = c + b | 0;
			return ((c ^ b | 0) > -1 & (d ^ c | 0) < 0 ? c >> 31 ^ 2147483647 : d) | 0
		}

		function Cb(a, c) {
			a = a | 0;
			c = c | 0;
			var d = 0,
				e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0;
			b[c >> 1] = b[8740 + (b[a >> 1] << 1 << 1) >> 1] | 0;
			r = c + 2 | 0;
			b[r >> 1] = b[8740 + ((b[a >> 1] << 1 | 1) << 1) >> 1] | 0;
			l = a + 2 | 0;
			s = a + 4 | 0;
			q = c + 4 | 0;
			b[q >> 1] = b[8996 + ((b[l >> 1] | 0) * 3 << 1) >> 1] | 0;
			n = c + 10 | 0;
			b[n >> 1] = b[9380 + ((b[s >> 1] | 0) * 3 << 1) >> 1] | 0;
			p = c + 6 | 0;
			b[p >> 1] = b[8996 + (((b[l >> 1] | 0) * 3 | 0) + 1 << 1) >> 1] | 0;
			m = c + 12 | 0;
			b[m >> 1] = b[9380 + (((b[s >> 1] | 0) * 3 | 0) + 1 << 1) >> 1] | 0;
			o = c + 8 | 0;
			b[o >> 1] = b[8996 + (((b[l >> 1] | 0) * 3 | 0) + 2 << 1) >> 1] | 0;
			l = c + 14 | 0;
			b[l >> 1] = b[9380 + (((b[s >> 1] | 0) * 3 | 0) + 2 << 1) >> 1] | 0;
			s = a + 6 | 0;
			d = a + 8 | 0;
			k = c + 16 | 0;
			b[k >> 1] = b[9764 + (b[s >> 1] << 2 << 1) >> 1] | 0;
			g = c + 24 | 0;
			b[g >> 1] = b[10020 + (b[d >> 1] << 2 << 1) >> 1] | 0;
			j = c + 18 | 0;
			b[j >> 1] = b[9764 + ((b[s >> 1] << 2 | 1) << 1) >> 1] | 0;
			f = c + 26 | 0;
			b[f >> 1] = b[10020 + ((b[d >> 1] << 2 | 1) << 1) >> 1] | 0;
			i = c + 20 | 0;
			b[i >> 1] = b[9764 + ((b[s >> 1] << 2 | 2) << 1) >> 1] | 0;
			e = c + 28 | 0;
			b[e >> 1] = b[10020 + ((b[d >> 1] << 2 | 2) << 1) >> 1] | 0;
			h = c + 22 | 0;
			b[h >> 1] = b[9764 + ((b[s >> 1] << 2 | 3) << 1) >> 1] | 0;
			a = c + 30 | 0;
			b[a >> 1] = b[10020 + ((b[d >> 1] << 2 | 3) << 1) >> 1] | 0;
			d = (b[4354] | 0) + (b[c >> 1] | 0) | 0;
			s = d >> 31;
			b[c >> 1] = (d >> 15 | 0) == (s | 0) ? d : s ^ 32767;
			s = (b[4355] | 0) + (b[r >> 1] | 0) | 0;
			d = s >> 31;
			b[r >> 1] = (s >> 15 | 0) == (d | 0) ? s : d ^ 32767;
			r = (b[4356] | 0) + (b[q >> 1] | 0) | 0;
			d = r >> 31;
			b[q >> 1] = (r >> 15 | 0) == (d | 0) ? r : d ^ 32767;
			q = (b[4357] | 0) + (b[p >> 1] | 0) | 0;
			d = q >> 31;
			b[p >> 1] = (q >> 15 | 0) == (d | 0) ? q : d ^ 32767;
			p = (b[4358] | 0) + (b[o >> 1] | 0) | 0;
			d = p >> 31;
			b[o >> 1] = (p >> 15 | 0) == (d | 0) ? p : d ^ 32767;
			o = (b[4359] | 0) + (b[n >> 1] | 0) | 0;
			d = o >> 31;
			b[n >> 1] = (o >> 15 | 0) == (d | 0) ? o : d ^ 32767;
			n = (b[4360] | 0) + (b[m >> 1] | 0) | 0;
			d = n >> 31;
			b[m >> 1] = (n >> 15 | 0) == (d | 0) ? n : d ^ 32767;
			m = (b[4361] | 0) + (b[l >> 1] | 0) | 0;
			d = m >> 31;
			b[l >> 1] = (m >> 15 | 0) == (d | 0) ? m : d ^ 32767;
			l = (b[4362] | 0) + (b[k >> 1] | 0) | 0;
			d = l >> 31;
			b[k >> 1] = (l >> 15 | 0) == (d | 0) ? l : d ^ 32767;
			k = (b[4363] | 0) + (b[j >> 1] | 0) | 0;
			d = k >> 31;
			b[j >> 1] = (k >> 15 | 0) == (d | 0) ? k : d ^ 32767;
			j = (b[4364] | 0) + (b[i >> 1] | 0) | 0;
			d = j >> 31;
			b[i >> 1] = (j >> 15 | 0) == (d | 0) ? j : d ^ 32767;
			i = (b[4365] | 0) + (b[h >> 1] | 0) | 0;
			d = i >> 31;
			b[h >> 1] = (i >> 15 | 0) == (d | 0) ? i : d ^ 32767;
			h = (b[4366] | 0) + (b[g >> 1] | 0) | 0;
			d = h >> 31;
			b[g >> 1] = (h >> 15 | 0) == (d | 0) ? h : d ^ 32767;
			g = (b[4367] | 0) + (b[f >> 1] | 0) | 0;
			d = g >> 31;
			b[f >> 1] = (g >> 15 | 0) == (d | 0) ? g : d ^ 32767;
			f = (b[4368] | 0) + (b[e >> 1] | 0) | 0;
			d = f >> 31;
			b[e >> 1] = (f >> 15 | 0) == (d | 0) ? f : d ^ 32767;
			e = (b[4369] | 0) + (b[a >> 1] | 0) | 0;
			d = e >> 31;
			b[a >> 1] = (e >> 15 | 0) == (d | 0) ? e : d ^ 32767;
			Eb(c, 128, 16);
			return
		}

		function Db(a, c, d, f, g, h, i) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			i = i | 0;
			var j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0,
				E = 0,
				F = 0;
			z = l;
			l = l + 32 | 0;
			if ((l | 0) >= (m | 0)) W(32);
			j = z;
			if (!(h << 16 >> 16)) {
				b[c >> 1] = b[10308 + ((b[a >> 1] | 0) * 9 << 1) >> 1] | 0;
				n = c + 2 | 0;
				b[n >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 1 << 1) >> 1] | 0;
				o = c + 4 | 0;
				b[o >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 2 << 1) >> 1] | 0;
				p = c + 6 | 0;
				b[p >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 3 << 1) >> 1] | 0;
				q = c + 8 | 0;
				b[q >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 4 << 1) >> 1] | 0;
				r = c + 10 | 0;
				b[r >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 5 << 1) >> 1] | 0;
				s = c + 12 | 0;
				b[s >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 6 << 1) >> 1] | 0;
				t = c + 14 | 0;
				b[t >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 7 << 1) >> 1] | 0;
				u = c + 16 | 0;
				b[u >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 8 << 1) >> 1] | 0;
				D = a + 2 | 0;
				F = b[14916 + ((b[D >> 1] | 0) * 7 << 1) >> 1] | 0;
				v = c + 18 | 0;
				b[v >> 1] = F;
				w = c + 20 | 0;
				b[w >> 1] = b[14916 + (((b[D >> 1] | 0) * 7 | 0) + 1 << 1) >> 1] | 0;
				x = c + 22 | 0;
				b[x >> 1] = b[14916 + (((b[D >> 1] | 0) * 7 | 0) + 2 << 1) >> 1] | 0;
				E = b[14916 + (((b[D >> 1] | 0) * 7 | 0) + 3 << 1) >> 1] | 0;
				y = c + 24 | 0;
				b[y >> 1] = E;
				f = c + 26 | 0;
				b[f >> 1] = b[14916 + (((b[D >> 1] | 0) * 7 | 0) + 4 << 1) >> 1] | 0;
				j = c + 28 | 0;
				b[j >> 1] = b[14916 + (((b[D >> 1] | 0) * 7 | 0) + 5 << 1) >> 1] | 0;
				k = c + 30 | 0;
				b[k >> 1] = b[14916 + (((b[D >> 1] | 0) * 7 | 0) + 6 << 1) >> 1] | 0;
				D = a + 4 | 0;
				C = a + 6 | 0;
				B = a + 8 | 0;
				A = a + 10 | 0;
				h = a + 12 | 0;
				b[c >> 1] = (e[c >> 1] | 0) + (e[18500 + ((b[D >> 1] | 0) * 3 << 1) >> 1] | 0);
				b[p >> 1] = (e[p >> 1] | 0) + (e[18884 + ((b[C >> 1] | 0) * 3 << 1) >> 1] | 0);
				b[s >> 1] = (e[s >> 1] | 0) + (e[19652 + ((b[B >> 1] | 0) * 3 << 1) >> 1] | 0);
				b[v >> 1] = (F & 65535) + (e[20420 + ((b[A >> 1] | 0) * 3 << 1) >> 1] | 0);
				b[y >> 1] = (E & 65535) + (e[20612 + (b[h >> 1] << 2 << 1) >> 1] | 0);
				b[n >> 1] = (e[n >> 1] | 0) + (e[18500 + (((b[D >> 1] | 0) * 3 | 0) + 1 << 1) >> 1] | 0);
				b[q >> 1] = (e[q >> 1] | 0) + (e[18884 + (((b[C >> 1] | 0) * 3 | 0) + 1 << 1) >> 1] | 0);
				b[t >> 1] = (e[t >> 1] | 0) + (e[19652 + (((b[B >> 1] | 0) * 3 | 0) + 1 << 1) >> 1] | 0);
				b[w >> 1] = (e[w >> 1] | 0) + (e[20420 + (((b[A >> 1] | 0) * 3 | 0) + 1 << 1) >> 1] | 0);
				b[f >> 1] = (e[f >> 1] | 0) + (e[20612 + ((b[h >> 1] << 2 | 1) << 1) >> 1] | 0);
				b[o >> 1] = (e[o >> 1] | 0) + (e[18500 + (((b[D >> 1] | 0) * 3 | 0) + 2 << 1) >> 1] | 0);
				b[r >> 1] = (e[r >> 1] | 0) + (e[18884 + (((b[C >> 1] | 0) * 3 | 0) + 2 << 1) >> 1] | 0);
				b[u >> 1] = (e[u >> 1] | 0) + (e[19652 + (((b[B >> 1] | 0) * 3 | 0) + 2 << 1) >> 1] | 0);
				b[x >> 1] = (e[x >> 1] | 0) + (e[20420 + (((b[A >> 1] | 0) * 3 | 0) + 2 << 1) >> 1] | 0);
				b[j >> 1] = (e[j >> 1] | 0) + (e[20612 + ((b[h >> 1] << 2 | 2) << 1) >> 1] | 0);
				b[k >> 1] = (e[k >> 1] | 0) + (e[20612 + ((b[h >> 1] << 2 | 3) << 1) >> 1] | 0);
				h = 0;
				do {
					D = c + (h << 1) | 0;
					E = b[D >> 1] | 0;
					C = (e[10276 + (h << 1) >> 1] | 0) + (E & 65535) | 0;
					b[D >> 1] = C;
					F = d + (h << 1) | 0;
					b[D >> 1] = (((b[F >> 1] | 0) * 10923 | 0) >>> 15) + C;
					b[F >> 1] = E;
					h = h + 1 | 0
				} while ((h | 0) != 16);
				if (i << 16 >> 16) {
					E = g + 32 | 0;
					b[g + 64 >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[g >> 1] | 0;
					b[g >> 1] = b[c >> 1] | 0;
					E = g + 34 | 0;
					b[g + 66 >> 1] = b[E >> 1] | 0;
					F = g + 2 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[n >> 1] | 0;
					F = g + 36 | 0;
					b[g + 68 >> 1] = b[F >> 1] | 0;
					E = g + 4 | 0;
					b[F >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[o >> 1] | 0;
					E = g + 38 | 0;
					b[g + 70 >> 1] = b[E >> 1] | 0;
					F = g + 6 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[p >> 1] | 0;
					F = g + 40 | 0;
					b[g + 72 >> 1] = b[F >> 1] | 0;
					E = g + 8 | 0;
					b[F >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[q >> 1] | 0;
					E = g + 42 | 0;
					b[g + 74 >> 1] = b[E >> 1] | 0;
					F = g + 10 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[r >> 1] | 0;
					F = g + 44 | 0;
					b[g + 76 >> 1] = b[F >> 1] | 0;
					E = g + 12 | 0;
					b[F >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[s >> 1] | 0;
					E = g + 46 | 0;
					b[g + 78 >> 1] = b[E >> 1] | 0;
					F = g + 14 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[t >> 1] | 0;
					F = g + 48 | 0;
					b[g + 80 >> 1] = b[F >> 1] | 0;
					E = g + 16 | 0;
					b[F >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[u >> 1] | 0;
					E = g + 50 | 0;
					b[g + 82 >> 1] = b[E >> 1] | 0;
					F = g + 18 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[v >> 1] | 0;
					F = g + 52 | 0;
					b[g + 84 >> 1] = b[F >> 1] | 0;
					E = g + 20 | 0;
					b[F >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[w >> 1] | 0;
					E = g + 54 | 0;
					b[g + 86 >> 1] = b[E >> 1] | 0;
					F = g + 22 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[x >> 1] | 0;
					F = g + 56 | 0;
					b[g + 88 >> 1] = b[F >> 1] | 0;
					E = g + 24 | 0;
					b[F >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[y >> 1] | 0;
					E = g + 58 | 0;
					b[g + 90 >> 1] = b[E >> 1] | 0;
					F = g + 26 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[f >> 1] | 0;
					F = g + 60 | 0;
					b[g + 92 >> 1] = b[F >> 1] | 0;
					E = g + 28 | 0;
					b[F >> 1] = b[E >> 1] | 0;
					b[E >> 1] = b[j >> 1] | 0;
					E = g + 62 | 0;
					b[g + 94 >> 1] = b[E >> 1] | 0;
					F = g + 30 | 0;
					b[E >> 1] = b[F >> 1] | 0;
					b[F >> 1] = b[k >> 1] | 0
				}
			} else {
				h = 0;
				do {
					F = b[10276 + (h << 1) >> 1] | 0;
					E = F << 14;
					C = b[g + (h << 1) >> 1] << 14;
					D = C + E | 0;
					D = (C ^ E | 0) > -1 & (D ^ E | 0) < 0 ? F >> 17 ^ 2147483647 : D;
					F = b[g + (h + 16 << 1) >> 1] << 14;
					E = F + D | 0;
					E = (F ^ D | 0) > -1 & (E ^ D | 0) < 0 ? D >> 31 ^ 2147483647 : E;
					D = b[g + (h + 32 << 1) >> 1] << 14;
					F = D + E | 0;
					F = (D ^ E | 0) > -1 & (F ^ E | 0) < 0 ? E >> 31 ^ 2147483647 : F;
					b[j + (h << 1) >> 1] = (F | 0) == 2147483647 ? 32767 : (F + 32768 | 0) >>> 16 & 65535;
					h = h + 1 | 0
				} while ((h | 0) != 16);
				h = 0;
				do {
					F = (b[f + (h << 1) >> 1] | 0) * 29491 | 0;
					E = F >> 31;
					C = (b[j + (h << 1) >> 1] | 0) * 3277 | 0;
					D = C >> 31;
					E = (((C >> 30 | 0) == (D | 0) ? C >>> 15 : D ^ 32767) << 16 >> 16) + (((F >> 30 | 0) == (E | 0) ?
						F >>> 15 : E ^ 32767) << 16 >> 16) | 0;
					F = E >> 31;
					b[c + (h << 1) >> 1] = (E >> 15 | 0) == (F | 0) ? E : F ^ 32767;
					h = h + 1 | 0
				} while ((h | 0) != 16);
				h = 0;
				do {
					F = d + (h << 1) | 0;
					D = (b[F >> 1] | 0) * 10923 | 0;
					E = D >> 31;
					E = (((D >> 30 | 0) == (E | 0) ? D >>> 15 : E ^ 32767) << 16 >> 16) + (b[j + (h << 1) >> 1] | 0) | 0;
					D = E >> 31;
					D = (b[c + (h << 1) >> 1] | 0) - (((E >> 15 | 0) == (D | 0) ? E : D ^ 32767) << 16 >> 16) | 0;
					E = D >> 31;
					b[F >> 1] = (((D >> 15 | 0) == (E | 0) ? D : E ^ 32766) & 65535) << 16 >> 16 >> 1;
					h = h + 1 | 0
				} while ((h | 0) != 16)
			}
			h = b[c >> 1] | 0;
			if (h << 16 >> 16 < 128) {
				b[c >> 1] = 128;
				h = 128
			}
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 2 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 4 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 6 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 8 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 10 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 12 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 14 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 16 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 18 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 20 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 22 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 24 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			f = (h << 16 >> 16) + 128 | 0;
			h = f >> 31;
			h = ((f >> 15 | 0) == (h | 0) ? f : h ^ 32767) & 65535;
			f = c + 26 | 0;
			j = b[f >> 1] | 0;
			if (j << 16 >> 16 < h << 16 >> 16) b[f >> 1] = h;
			else h = j;
			h = (h << 16 >> 16) + 128 | 0;
			f = h >> 31;
			f = ((h >> 15 | 0) == (f | 0) ? h : f ^ 32767) & 65535;
			h = c + 28 | 0;
			if ((b[h >> 1] | 0) >= f << 16 >> 16) {
				l = z;
				return
			}
			b[h >> 1] = f;
			l = z;
			return
		}

		function Eb(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0,
				h = 0;
			h = (d << 16 >> 16) + -1 | 0;
			if (d << 16 >> 16 <= 1) return;
			g = c << 16 >> 16;
			f = 0;
			d = c;
			e = 0;
			while (1) {
				c = a + (e << 1) | 0;
				e = b[c >> 1] | 0;
				if (e << 16 >> 16 < d << 16 >> 16) b[c >> 1] = d;
				else d = e;
				d = (d << 16 >> 16) + g | 0;
				c = d >> 31;
				f = f + 1 << 16 >> 16;
				e = f << 16 >> 16;
				if ((h | 0) <= (e | 0)) break;
				else d = ((d >> 15 | 0) == (c | 0) ? d : c ^ 32767) & 65535
			}
			return
		}

		function Fb(a, c, d, e, f, g, h) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			var i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0;
			y = l;
			l = l + 32 | 0;
			if ((l | 0) >= (m | 0)) W(32);
			i = y;
			if (!(g << 16 >> 16)) {
				b[c >> 1] = b[10308 + ((b[a >> 1] | 0) * 9 << 1) >> 1] | 0;
				o = c + 2 | 0;
				b[o >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 1 << 1) >> 1] | 0;
				q = c + 4 | 0;
				b[q >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 2 << 1) >> 1] | 0;
				r = c + 6 | 0;
				b[r >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 3 << 1) >> 1] | 0;
				s = c + 8 | 0;
				b[s >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 4 << 1) >> 1] | 0;
				t = c + 10 | 0;
				b[t >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 5 << 1) >> 1] | 0;
				u = c + 12 | 0;
				b[u >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 6 << 1) >> 1] | 0;
				v = c + 14 | 0;
				b[v >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 7 << 1) >> 1] | 0;
				w = c + 16 | 0;
				b[w >> 1] = b[10308 + (((b[a >> 1] | 0) * 9 | 0) + 8 << 1) >> 1] | 0;
				z = a + 2 | 0;
				g = a + 8 | 0;
				p = (b[23172 + ((b[g >> 1] | 0) * 7 << 1) >> 1] | 0) + (b[14916 + ((b[z >> 1] | 0) * 7 << 1) >> 1] |
					0) | 0;
				A = p >> 31;
				x = c + 18 | 0;
				b[x >> 1] = (p >> 15 | 0) == (A | 0) ? p : A ^ 32767;
				A = (b[23172 + (((b[g >> 1] | 0) * 7 | 0) + 1 << 1) >> 1] | 0) + (b[14916 + (((b[z >> 1] | 0) * 7 | 0) +
					1 << 1) >> 1] | 0) | 0;
				p = A >> 31;
				e = c + 20 | 0;
				b[e >> 1] = (A >> 15 | 0) == (p | 0) ? A : p ^ 32767;
				p = (b[23172 + (((b[g >> 1] | 0) * 7 | 0) + 2 << 1) >> 1] | 0) + (b[14916 + (((b[z >> 1] | 0) * 7 | 0) +
					2 << 1) >> 1] | 0) | 0;
				A = p >> 31;
				i = c + 22 | 0;
				b[i >> 1] = (p >> 15 | 0) == (A | 0) ? p : A ^ 32767;
				A = (b[23172 + (((b[g >> 1] | 0) * 7 | 0) + 3 << 1) >> 1] | 0) + (b[14916 + (((b[z >> 1] | 0) * 7 | 0) +
					3 << 1) >> 1] | 0) | 0;
				p = A >> 31;
				j = c + 24 | 0;
				b[j >> 1] = (A >> 15 | 0) == (p | 0) ? A : p ^ 32767;
				p = (b[23172 + (((b[g >> 1] | 0) * 7 | 0) + 4 << 1) >> 1] | 0) + (b[14916 + (((b[z >> 1] | 0) * 7 | 0) +
					4 << 1) >> 1] | 0) | 0;
				A = p >> 31;
				k = c + 26 | 0;
				b[k >> 1] = (p >> 15 | 0) == (A | 0) ? p : A ^ 32767;
				A = (b[23172 + (((b[g >> 1] | 0) * 7 | 0) + 5 << 1) >> 1] | 0) + (b[14916 + (((b[z >> 1] | 0) * 7 | 0) +
					5 << 1) >> 1] | 0) | 0;
				p = A >> 31;
				n = c + 28 | 0;
				b[n >> 1] = (A >> 15 | 0) == (p | 0) ? A : p ^ 32767;
				z = (b[23172 + (((b[g >> 1] | 0) * 7 | 0) + 6 << 1) >> 1] | 0) + (b[14916 + (((b[z >> 1] | 0) * 7 | 0) +
					6 << 1) >> 1] | 0) | 0;
				g = z >> 31;
				p = c + 30 | 0;
				b[p >> 1] = (z >> 15 | 0) == (g | 0) ? z : g ^ 32767;
				g = a + 4 | 0;
				z = (b[20868 + ((b[g >> 1] | 0) * 5 << 1) >> 1] | 0) + (b[c >> 1] | 0) | 0;
				A = z >> 31;
				b[c >> 1] = (z >> 15 | 0) == (A | 0) ? z : A ^ 32767;
				A = (b[20868 + (((b[g >> 1] | 0) * 5 | 0) + 1 << 1) >> 1] | 0) + (b[o >> 1] | 0) | 0;
				z = A >> 31;
				b[o >> 1] = (A >> 15 | 0) == (z | 0) ? A : z ^ 32767;
				z = (b[20868 + (((b[g >> 1] | 0) * 5 | 0) + 2 << 1) >> 1] | 0) + (b[q >> 1] | 0) | 0;
				A = z >> 31;
				b[q >> 1] = (z >> 15 | 0) == (A | 0) ? z : A ^ 32767;
				A = (b[20868 + (((b[g >> 1] | 0) * 5 | 0) + 3 << 1) >> 1] | 0) + (b[r >> 1] | 0) | 0;
				z = A >> 31;
				b[r >> 1] = (A >> 15 | 0) == (z | 0) ? A : z ^ 32767;
				g = (b[20868 + (((b[g >> 1] | 0) * 5 | 0) + 4 << 1) >> 1] | 0) + (b[s >> 1] | 0) | 0;
				z = g >> 31;
				b[s >> 1] = (g >> 15 | 0) == (z | 0) ? g : z ^ 32767;
				a = a + 6 | 0;
				z = (b[22148 + (b[a >> 1] << 2 << 1) >> 1] | 0) + (b[t >> 1] | 0) | 0;
				g = z >> 31;
				b[t >> 1] = (z >> 15 | 0) == (g | 0) ? z : g ^ 32767;
				g = (b[22148 + ((b[a >> 1] << 2 | 1) << 1) >> 1] | 0) + (b[u >> 1] | 0) | 0;
				z = g >> 31;
				b[u >> 1] = (g >> 15 | 0) == (z | 0) ? g : z ^ 32767;
				z = (b[22148 + ((b[a >> 1] << 2 | 2) << 1) >> 1] | 0) + (b[v >> 1] | 0) | 0;
				g = z >> 31;
				b[v >> 1] = (z >> 15 | 0) == (g | 0) ? z : g ^ 32767;
				a = (b[22148 + ((b[a >> 1] << 2 | 3) << 1) >> 1] | 0) + (b[w >> 1] | 0) | 0;
				g = a >> 31;
				b[w >> 1] = (a >> 15 | 0) == (g | 0) ? a : g ^ 32767;
				g = 0;
				do {
					a = c + (g << 1) | 0;
					z = b[a >> 1] | 0;
					A = (b[10276 + (g << 1) >> 1] | 0) + (z << 16 >> 16) | 0;
					C = A >> 31;
					C = (A >> 15 | 0) == (C | 0) ? A : C ^ 32767;
					b[a >> 1] = C;
					A = d + (g << 1) | 0;
					D = (b[A >> 1] | 0) * 10923 | 0;
					B = D >> 31;
					C = (((D >> 30 | 0) == (B | 0) ? D >>> 15 : B ^ 32767) << 16 >> 16) + (C << 16 >> 16) | 0;
					B = C >> 31;
					b[a >> 1] = (C >> 15 | 0) == (B | 0) ? C : B ^ 32767;
					b[A >> 1] = z;
					g = g + 1 | 0
				} while ((g | 0) != 16);
				if (h << 16 >> 16) {
					C = f + 32 | 0;
					b[f + 64 >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[f >> 1] | 0;
					b[f >> 1] = b[c >> 1] | 0;
					C = f + 34 | 0;
					b[f + 66 >> 1] = b[C >> 1] | 0;
					D = f + 2 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[o >> 1] | 0;
					D = f + 36 | 0;
					b[f + 68 >> 1] = b[D >> 1] | 0;
					C = f + 4 | 0;
					b[D >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[q >> 1] | 0;
					C = f + 38 | 0;
					b[f + 70 >> 1] = b[C >> 1] | 0;
					D = f + 6 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[r >> 1] | 0;
					D = f + 40 | 0;
					b[f + 72 >> 1] = b[D >> 1] | 0;
					C = f + 8 | 0;
					b[D >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[s >> 1] | 0;
					C = f + 42 | 0;
					b[f + 74 >> 1] = b[C >> 1] | 0;
					D = f + 10 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[t >> 1] | 0;
					D = f + 44 | 0;
					b[f + 76 >> 1] = b[D >> 1] | 0;
					C = f + 12 | 0;
					b[D >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[u >> 1] | 0;
					C = f + 46 | 0;
					b[f + 78 >> 1] = b[C >> 1] | 0;
					D = f + 14 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[v >> 1] | 0;
					D = f + 48 | 0;
					b[f + 80 >> 1] = b[D >> 1] | 0;
					C = f + 16 | 0;
					b[D >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[w >> 1] | 0;
					C = f + 50 | 0;
					b[f + 82 >> 1] = b[C >> 1] | 0;
					D = f + 18 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[x >> 1] | 0;
					D = f + 52 | 0;
					b[f + 84 >> 1] = b[D >> 1] | 0;
					C = f + 20 | 0;
					b[D >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[e >> 1] | 0;
					C = f + 54 | 0;
					b[f + 86 >> 1] = b[C >> 1] | 0;
					D = f + 22 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[i >> 1] | 0;
					D = f + 56 | 0;
					b[f + 88 >> 1] = b[D >> 1] | 0;
					C = f + 24 | 0;
					b[D >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[j >> 1] | 0;
					C = f + 58 | 0;
					b[f + 90 >> 1] = b[C >> 1] | 0;
					D = f + 26 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[k >> 1] | 0;
					D = f + 60 | 0;
					b[f + 92 >> 1] = b[D >> 1] | 0;
					C = f + 28 | 0;
					b[D >> 1] = b[C >> 1] | 0;
					b[C >> 1] = b[n >> 1] | 0;
					C = f + 62 | 0;
					b[f + 94 >> 1] = b[C >> 1] | 0;
					D = f + 30 | 0;
					b[C >> 1] = b[D >> 1] | 0;
					b[D >> 1] = b[p >> 1] | 0
				}
			} else {
				g = 0;
				do {
					D = b[10276 + (g << 1) >> 1] | 0;
					C = D << 14;
					A = b[f + (g << 1) >> 1] << 14;
					B = A + C | 0;
					B = (A ^ C | 0) > -1 & (B ^ C | 0) < 0 ? D >> 17 ^ 2147483647 : B;
					D = b[f + (g + 16 << 1) >> 1] << 14;
					C = D + B | 0;
					C = (D ^ B | 0) > -1 & (C ^ B | 0) < 0 ? B >> 31 ^ 2147483647 : C;
					B = b[f + (g + 32 << 1) >> 1] << 14;
					D = B + C | 0;
					D = (B ^ C | 0) > -1 & (D ^ C | 0) < 0 ? C >> 31 ^ 2147483647 : D;
					b[i + (g << 1) >> 1] = (D | 0) == 2147483647 ? 32767 : (D + 32768 | 0) >>> 16 & 65535;
					g = g + 1 | 0
				} while ((g | 0) != 16);
				g = 0;
				do {
					D = (b[e + (g << 1) >> 1] | 0) * 29491 | 0;
					C = D >> 31;
					A = (b[i + (g << 1) >> 1] | 0) * 3277 | 0;
					B = A >> 31;
					C = (((A >> 30 | 0) == (B | 0) ? A >>> 15 : B ^ 32767) << 16 >> 16) + (((D >> 30 | 0) == (C | 0) ?
						D >>> 15 : C ^ 32767) << 16 >> 16) | 0;
					D = C >> 31;
					b[c + (g << 1) >> 1] = (C >> 15 | 0) == (D | 0) ? C : D ^ 32767;
					g = g + 1 | 0
				} while ((g | 0) != 16);
				g = 0;
				do {
					D = d + (g << 1) | 0;
					B = (b[D >> 1] | 0) * 10923 | 0;
					C = B >> 31;
					C = (((B >> 30 | 0) == (C | 0) ? B >>> 15 : C ^ 32767) << 16 >> 16) + (b[i + (g << 1) >> 1] | 0) | 0;
					B = C >> 31;
					B = (b[c + (g << 1) >> 1] | 0) - (((C >> 15 | 0) == (B | 0) ? C : B ^ 32767) << 16 >> 16) | 0;
					C = B >> 31;
					b[D >> 1] = (((B >> 15 | 0) == (C | 0) ? B : C ^ 32766) & 65535) << 16 >> 16 >> 1;
					g = g + 1 | 0
				} while ((g | 0) != 16)
			}
			g = b[c >> 1] | 0;
			if (g << 16 >> 16 < 128) {
				b[c >> 1] = 128;
				g = 128
			}
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 2 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 4 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 6 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 8 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 10 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 12 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 14 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 16 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 18 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 20 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 22 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 24 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			e = (g << 16 >> 16) + 128 | 0;
			g = e >> 31;
			g = ((e >> 15 | 0) == (g | 0) ? e : g ^ 32767) & 65535;
			e = c + 26 | 0;
			i = b[e >> 1] | 0;
			if (i << 16 >> 16 < g << 16 >> 16) b[e >> 1] = g;
			else g = i;
			g = (g << 16 >> 16) + 128 | 0;
			e = g >> 31;
			e = ((g >> 15 | 0) == (e | 0) ? g : e ^ 32767) & 65535;
			g = c + 28 | 0;
			if ((b[g >> 1] | 0) >= e << 16 >> 16) {
				l = y;
				return
			}
			b[g >> 1] = e;
			l = y;
			return
		}

		function Gb(a, c, d) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0;
			if (d << 16 >> 16 > 0) {
				if (c << 16 >> 16 <= 0) return;
				f = d << 16 >> 16;
				c = c & 65535;
				d = 0;
				do {
					g = a + (d << 1) | 0;
					h = e[g >> 1] << 16;
					i = h << f;
					h = (i >> f | 0) == (h | 0) ? i : h >> 31 ^ 2147483647;
					b[g >> 1] = (h | 0) == 2147483647 ? 32767 : (h + 32768 | 0) >>> 16 & 65535;
					d = d + 1 | 0
				} while ((d | 0) != (c | 0));
				return
			}
			if (d << 16 >> 16 >= 0) return;
			g = 0 - d & 15;
			d = c << 16 >> 16 >> 1;
			if (!(d << 16 >> 16)) return;
			f = 32768 >>> (16 - g | 0) << 16 >> 16;
			c = a;
			while (1) {
				a = f + (b[c >> 1] | 0) | 0;
				i = a >> 31;
				b[c >> 1] = ((a >> 15 | 0) == (i | 0) ? a : i ^ 32767) << 16 >> 16 >> g;
				i = c + 2 | 0;
				a = f + (b[i >> 1] | 0) | 0;
				h = a >> 31;
				b[i >> 1] = ((a >> 15 | 0) == (h | 0) ? a : h ^ 32767) << 16 >> 16 >> g;
				d = d + -1 << 16 >> 16;
				if (!(d << 16 >> 16)) break;
				else c = c + 4 | 0
			}
			return
		}

		function Hb(d, f, g, h, i, j, k, n, o, p, q) {
			d = d | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			i = i | 0;
			j = j | 0;
			k = k | 0;
			n = n | 0;
			o = o | 0;
			p = p | 0;
			q = q | 0;
			var r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0,
				E = 0;
			E = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			A = E + 6 | 0;
			z = E + 4 | 0;
			C = E;
			r = q + 160 | 0;
			B = q + 320 | 0;
			s = q + 448 | 0;
			D = q + 608 | 0;
			u = o + 704 | 0;
			w = q;
			x = u;
			y = w + 32 | 0;
			do {
				a[w >> 0] = a[x >> 0] | 0;
				w = w + 1 | 0;
				x = x + 1 | 0
			} while ((w | 0) < (y | 0));
			v = o + 736 | 0;
			w = r;
			x = v;
			y = w + 32 | 0;
			do {
				a[w >> 0] = a[x >> 0] | 0;
				w = w + 1 | 0;
				x = x + 1 | 0
			} while ((w | 0) < (y | 0));
			r = q + 32 | 0;
			t = q + 192 | 0;
			Kb(d, 16, f, g, r, t, 64);
			w = u;
			x = q + 128 | 0;
			y = w + 32 | 0;
			do {
				a[w >> 0] = a[x >> 0] | 0;
				w = w + 1 | 0;
				x = x + 1 | 0
			} while ((w | 0) < (y | 0));
			w = v;
			x = q + 288 | 0;
			y = w + 32 | 0;
			do {
				a[w >> 0] = a[x >> 0] | 0;
				w = w + 1 | 0;
				x = x + 1 | 0
			} while ((w | 0) < (y | 0));
			Ia(r, t, B, 22282, 64, o + 768 | 0);
			Ta(B, 64, o + 770 | 0);
			ib(B, 64, h, o + 782 | 0, q);
			u = o + 1052 | 0;
			r = 20;
			t = s;
			while (1) {
				b[t >> 1] = (fb(u) | 0) << 16 >> 16 >> 3;
				b[t + 2 >> 1] = (fb(u) | 0) << 16 >> 16 >> 3;
				b[t + 4 >> 1] = (fb(u) | 0) << 16 >> 16 >> 3;
				b[t + 6 >> 1] = (fb(u) | 0) << 16 >> 16 >> 3;
				r = r + -1 << 16 >> 16;
				if (!(r << 16 >> 16)) break;
				else t = t + 8 | 0
			}
			w = q + 650 | 0;
			r = 16;
			t = f;
			while (1) {
				v = (b[t >> 1] | 0) + 4 | 0;
				y = v >> 31;
				b[t >> 1] = (((v >> 15 | 0) == (y | 0) ? v : y ^ 32760) & 65535) << 16 >> 16 >> 3;
				y = t + 2 | 0;
				v = (b[y >> 1] | 0) + 4 | 0;
				x = v >> 31;
				b[y >> 1] = (((v >> 15 | 0) == (x | 0) ? v : x ^ 32760) & 65535) << 16 >> 16 >> 3;
				y = t + 4 | 0;
				x = (b[y >> 1] | 0) + 4 | 0;
				v = x >> 31;
				b[y >> 1] = (((x >> 15 | 0) == (v | 0) ? x : v ^ 32760) & 65535) << 16 >> 16 >> 3;
				y = t + 6 | 0;
				v = (b[y >> 1] | 0) + 4 | 0;
				x = v >> 31;
				b[y >> 1] = (((v >> 15 | 0) == (x | 0) ? v : x ^ 32760) & 65535) << 16 >> 16 >> 3;
				r = r + -1 << 16 >> 16;
				if (!(r << 16 >> 16)) break;
				else t = t + 8 | 0
			}
			t = yb(f, f, 64, z) | 0;
			b[z >> 1] = (e[z >> 1] | 0) - ((((g & 65535) << 16) + 2147287040 | 0) >>> 15);
			r = yb(s, s, 80, A) | 0;
			if ((r >> 16 | 0) > (t >> 16 | 0)) {
				b[A >> 1] = (e[A >> 1] | 0) + 1;
				r = r >> 17
			} else r = r >>> 16;
			c[C >> 2] = ((ub(r & 65535, t >>> 16 & 65535) | 0) & 65535) << 16;
			b[A >> 1] = (e[A >> 1] | 0) - (e[z >> 1] | 0);
			wb(C, A);
			r = c[C >> 2] | 0;
			z = (e[A >> 1] | 0) + 1 | 0;
			t = z << 16 >> 16;
			if ((z & 65535) << 16 >> 16 > 0) {
				z = r << t;
				r = (z >> t | 0) == (r | 0) ? z : r >> 31 ^ 2147483647
			} else r = r >> (0 - t & 15);
			c[C >> 2] = r;
			u = r >> 16;
			r = 20;
			t = s;
			while (1) {
				b[t >> 1] = (N(u, b[t >> 1] | 0) | 0) >>> 15;
				z = t + 2 | 0;
				b[z >> 1] = (N(u, b[z >> 1] | 0) | 0) >>> 15;
				z = t + 4 | 0;
				b[z >> 1] = (N(u, b[z >> 1] | 0) | 0) >>> 15;
				z = t + 6 | 0;
				b[z >> 1] = (N(u, b[z >> 1] | 0) | 0) >>> 15;
				r = r + -1 << 16 >> 16;
				if (!(r << 16 >> 16)) break;
				else t = t + 8 | 0
			}
			Ra(B, 64, o + 1132 | 0);
			t = b[B >> 1] | 0;
			r = t << 16 >> 16;
			r = N(r, r) | 0;
			r = (r | 0) == 1073741824 ? -2147483648 : r << 1 | 1;
			c[C >> 2] = r;
			v = 1;
			u = 1;
			do {
				z = t;
				t = b[B + (u << 1) >> 1] | 0;
				g = t << 16 >> 16;
				y = N(g, g) | 0;
				y = (y | 0) == 1073741824 ? 2147483647 : y << 1;
				f = y + r | 0;
				r = (y ^ r | 0) > -1 & (f ^ r | 0) < 0 ? r >> 31 ^ 2147483647 : f;
				g = N(z << 16 >> 16, g) | 0;
				g = (g | 0) == 1073741824 ? 2147483647 : g << 1;
				z = g + v | 0;
				v = (g ^ v | 0) > -1 & (z ^ v | 0) < 0 ? v >> 31 ^ 2147483647 : z;
				u = u + 1 | 0
			} while ((u | 0) != 64);
			c[C >> 2] = r;
			t = gb(r) | 0;
			b[A >> 1] = t;
			t = t << 16 >> 16;
			r = v << t;
			if ((r >> 16 | 0) > 0) t = ub(r >>> 16 & 65535, c[C >> 2] << t >>> 16 & 65535) | 0;
			else t = 0;
			u = (32767 - (t & 65535) << 16 >> 16) * 20480 | 0;
			r = u >> 31;
			r = (u >> 30 | 0) == (r | 0) ? u >>> 15 : r ^ 32767;
			u = r << 16 >> 16;
			if ((b[o + 1518 >> 1] | 0) > 0) r = (((r << 17 >> 17 | 0) == (u | 0) ? r << 1 : u >>> 15 ^ 32767) << 16 >>
				16) + -1 | 0;
			else r = (32767 - t & 65535) + 65535 | 0;
			r = ((r & 65535 | 0) != 0 & 1) + (r & 65535) << 16 >> 16;
			v = k << 16 >> 16 > 476;
			if (v & p << 16 >> 16 == 0) {
				u = b[24068 + (i << 16 >> 16 << 1) >> 1] | 0;
				r = s;
				t = 20;
				while (1) {
					C = N(b[r >> 1] | 0, u) | 0;
					p = C >> 31;
					b[r >> 1] = ((C >> 30 | 0) == (p | 0) ? C >>> 15 : p ^ 32767) << 1;
					p = r + 2 | 0;
					C = N(b[p >> 1] | 0, u) | 0;
					i = C >> 31;
					b[p >> 1] = ((C >> 30 | 0) == (i | 0) ? C >>> 15 : i ^ 32767) << 1;
					p = r + 4 | 0;
					i = N(b[p >> 1] | 0, u) | 0;
					C = i >> 31;
					b[p >> 1] = ((i >> 30 | 0) == (C | 0) ? i >>> 15 : C ^ 32767) << 1;
					p = r + 6 | 0;
					C = N(b[p >> 1] | 0, u) | 0;
					i = C >> 31;
					b[p >> 1] = ((C >> 30 | 0) == (i | 0) ? C >>> 15 : i ^ 32767) << 1;
					t = t + -1 << 16 >> 16;
					if (!(t << 16 >> 16)) break;
					else r = r + 8 | 0
				}
			} else {
				u = (r << 16 >> 16 > 3277 ? r : 3277) & 65535;
				r = s;
				t = 20;
				while (1) {
					C = N(b[r >> 1] | 0, u) | 0;
					p = C >> 31;
					b[r >> 1] = (C >> 30 | 0) == (p | 0) ? C >>> 15 : p ^ 32767;
					p = r + 2 | 0;
					C = N(b[p >> 1] | 0, u) | 0;
					i = C >> 31;
					b[p >> 1] = (C >> 30 | 0) == (i | 0) ? C >>> 15 : i ^ 32767;
					p = r + 4 | 0;
					i = N(b[p >> 1] | 0, u) | 0;
					C = i >> 31;
					b[p >> 1] = (i >> 30 | 0) == (C | 0) ? i >>> 15 : C ^ 32767;
					p = r + 6 | 0;
					C = N(b[p >> 1] | 0, u) | 0;
					i = C >> 31;
					b[p >> 1] = (C >> 30 | 0) == (i | 0) ? C >>> 15 : i ^ 32767;
					t = t + -1 << 16 >> 16;
					if (!(t << 16 >> 16)) break;
					else r = r + 8 | 0
				}
			}
			if (k << 16 >> 16 < 133 & n << 16 >> 16 == 0) {
				Ya(j);
				Za(j, w, 20, 0);
				Lb(w, D, 29491, 20);
				Jb(D, 20, s, s, 80, o + 830 | 0, 1, q)
			} else {
				Lb(d, D, 19661, 16);
				Jb(D, 16, s, s, 80, o + 838 | 0, 1, q)
			}
			xa(s, 80, o + 870 | 0, q);
			if (v) {
				cb(s, 80, o + 990 | 0, q);
				r = 40
			} else r = 40;
			while (1) {
				k = (b[s >> 1] | 0) + (b[h >> 1] | 0) | 0;
				o = k >> 31;
				b[h >> 1] = (k >> 15 | 0) == (o | 0) ? k : o ^ 32767;
				o = h + 2 | 0;
				k = (b[s + 2 >> 1] | 0) + (b[o >> 1] | 0) | 0;
				n = k >> 31;
				b[o >> 1] = (k >> 15 | 0) == (n | 0) ? k : n ^ 32767;
				r = r + -1 << 16 >> 16;
				if (!(r << 16 >> 16)) break;
				else {
					s = s + 4 | 0;
					h = h + 4 | 0
				}
			}
			l = E;
			return
		}

		function Ib(a, c, d, f, g, h) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			var i = 0,
				j = 0,
				k = 0,
				n = 0;
			n = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			j = n + 2 | 0;
			k = n;
			a = yb(a, a, h, j) | 0;
			c = (b[j >> 1] | 0) - ((c & 65535) << 17 >> 16) | 0;
			i = c >> 31;
			b[j >> 1] = (c >> 15 | 0) == (i | 0) ? c : i ^ 32767;
			i = d << 16 >> 16;
			i = N(i, i) | 0;
			i = (i | 0) == 1073741824 ? 2147483647 : i << 1;
			d = (gb(i) | 0) << 16 >> 16;
			a = N(i << d >> 16, a >> 16) | 0;
			i = a >> 31;
			i = (a >> 30 | 0) == (i | 0) ? a >>> 15 : i ^ 32767;
			b[j >> 1] = 65526 - d + (e[j >> 1] | 0);
			d = yb(f, f, h, k) | 0;
			a = g << 16 >> 16;
			f = ((gb(a) | 0) & 65535) + 65520 | 0;
			c = f << 16 >> 16;
			if ((f & 65535) << 16 >> 16 < 0) a = a >> (0 - c & 15);
			else {
				h = c & 15;
				g = a << h;
				a = (g << 16 >> 16 >> h | 0) == (a | 0) ? g : a >> 15 ^ 32767
			}
			c = a << 16 >> 16;
			c = N(c, c) | 0;
			c = N((c & 1073741824 | 0) == 0 ? c << 1 >> 16 : 32767, d >> 16) | 0;
			a = c >> 31;
			a = (c >> 30 | 0) == (a | 0) ? c >>> 15 : a ^ 32767;
			c = (e[k >> 1] | 0) - (f << 1) | 0;
			b[k >> 1] = c;
			k = (e[j >> 1] | 0) - c << 16;
			c = k >> 16;
			if ((k | 0) > -65536) {
				a = a << 16 >> 16 >> c + 1 & 65535;
				c = i << 16 >> 17
			} else {
				a = (a & 65535) << 16 >> 16 >> 1;
				c = i << 16 >> 16 >> 1 - c
			}
			a = a << 16 >> 16;
			d = c - a | 0;
			f = d & 65535;
			a = c + 1 + a & 65535;
			if (!(d & 32768)) {
				k = ub(f, a) | 0;
				l = n;
				return k | 0
			} else {
				k = ub(f << 16 >> 16 == -32768 ? 32767 : 0 - d & 65535, a) | 0;
				k = k << 16 >> 16 == -32768 ? 32767 : 0 - (k & 65535) & 65535;
				l = n;
				return k | 0
			}
			return 0
		}

		function Jb(a, c, d, e, f, g, h, i) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			i = i | 0;
			var j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0,
				z = 0,
				A = 0,
				B = 0,
				C = 0,
				D = 0;
			z = c << 16 >> 16;
			A = z << 1;
			ec(i | 0, g | 0, A | 0) | 0;
			y = i + (z << 1) | 0;
			t = f << 16 >> 16;
			u = t >> 2;
			if ((u | 0) > 0) {
				v = a + 6 | 0;
				w = a + 4 | 0;
				x = a + 2 | 0;
				s = c << 16 >> 16 > 4;
				r = 0;
				i = 0;
				do {
					m = i << 2;
					n = m | 1;
					o = m | 2;
					j = 0 - (b[d + (o << 1) >> 1] << 11) | 0;
					p = m | 3;
					i = 0 - (b[d + (p << 1) >> 1] << 11) | 0;
					B = b[v >> 1] | 0;
					l = (N(B, b[y + (m + -3 << 1) >> 1] | 0) | 0) - (b[d + (m << 1) >> 1] << 11) | 0;
					c = b[y + (m + -2 << 1) >> 1] | 0;
					B = (N(c, B) | 0) - (b[d + (n << 1) >> 1] << 11) | 0;
					k = b[w >> 1] | 0;
					c = l + (N(k, c) | 0) | 0;
					l = m + -1 | 0;
					q = y + (l << 1) | 0;
					f = b[q >> 1] | 0;
					k = B + (N(f, k) | 0) | 0;
					f = c + (N(b[x >> 1] | 0, f) | 0) | 0;
					if (s) {
						c = i;
						i = 4;
						do {
							D = b[a + (i + 1 << 1) >> 1] | 0;
							C = (N(D, b[y + (l - i << 1) >> 1] | 0) | 0) + f | 0;
							f = b[y + (m - i << 1) >> 1] | 0;
							k = (N(f, D) | 0) + k | 0;
							B = b[a + (i << 1) >> 1] | 0;
							f = C + (N(B, f) | 0) | 0;
							C = b[y + (n - i << 1) >> 1] | 0;
							k = k + (N(C, B) | 0) | 0;
							C = (N(C, D) | 0) + j | 0;
							j = b[y + (o - i << 1) >> 1] | 0;
							c = (N(j, D) | 0) + c | 0;
							j = C + (N(j, B) | 0) | 0;
							c = c + (N(b[y + (p - i << 1) >> 1] | 0, B) | 0) | 0;
							i = (i << 16) + 131072 >> 16
						} while ((i | 0) < (z | 0))
					} else {
						c = i;
						i = 4
					}
					D = b[a + (i << 1) >> 1] | 0;
					C = (N(D, b[y + (m - i << 1) >> 1] | 0) | 0) + f | 0;
					B = (N(b[y + (n - i << 1) >> 1] | 0, D) | 0) + k | 0;
					l = (N(b[y + (o - i << 1) >> 1] | 0, D) | 0) + j | 0;
					D = (N(b[y + (p - i << 1) >> 1] | 0, D) | 0) + c | 0;
					i = C << 4;
					C = (i >> 4 | 0) == (C | 0) ? i : C >> 31 ^ 2147483647;
					C = (C | 0) == -2147483647 ? 32767 : (32768 - C | 0) >>> 16 & 65535;
					i = y + (m << 1) | 0;
					b[i >> 1] = C;
					b[e + (m << 1) >> 1] = C;
					B = B + (N(b[x >> 1] | 0, b[i >> 1] | 0) | 0) | 0;
					C = B << 4;
					B = (C >> 4 | 0) == (B | 0) ? C : B >> 31 ^ 2147483647;
					B = (B | 0) == -2147483647 ? 32767 : (32768 - B | 0) >>> 16 & 65535;
					C = y + (n << 1) | 0;
					b[C >> 1] = B;
					b[e + (n << 1) >> 1] = B;
					B = b[v >> 1] | 0;
					q = l + (N(B, b[q >> 1] | 0) | 0) | 0;
					i = b[i >> 1] | 0;
					B = D + (N(i, B) | 0) | 0;
					D = b[w >> 1] | 0;
					i = q + (N(D, i) | 0) | 0;
					C = b[C >> 1] | 0;
					D = B + (N(C, D) | 0) | 0;
					C = i + (N(b[x >> 1] | 0, C) | 0) | 0;
					i = C << 4;
					C = (i >> 4 | 0) == (C | 0) ? i : C >> 31 ^ 2147483647;
					C = (C | 0) == -2147483647 ? 32767 : (32768 - C | 0) >>> 16 & 65535;
					i = y + (o << 1) | 0;
					b[i >> 1] = C;
					b[e + (o << 1) >> 1] = C;
					i = D + (N(b[x >> 1] | 0, b[i >> 1] | 0) | 0) | 0;
					D = i << 4;
					i = (D >> 4 | 0) == (i | 0) ? D : i >> 31 ^ 2147483647;
					i = (i | 0) == -2147483647 ? 32767 : (32768 - i | 0) >>> 16 & 65535;
					b[y + (p << 1) >> 1] = i;
					b[e + (p << 1) >> 1] = i;
					r = r + 1 << 16 >> 16;
					i = r << 16 >> 16
				} while ((u | 0) > (i | 0))
			}
			if (!(h << 16 >> 16)) return;
			ec(g | 0, e + (t - z << 1) | 0, A | 0) | 0;
			return
		}

		function Kb(a, c, d, e, f, g, h) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			f = f | 0;
			g = g | 0;
			h = h | 0;
			var i = 0,
				j = 0,
				k = 0,
				l = 0,
				m = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0;
			s = h << 16 >> 16 >> 1;
			if ((s | 0) <= 0) return;
			q = a + 2 | 0;
			r = c << 16 >> 16;
			p = c << 16 >> 16 > 2;
			o = 9 - (e & 65535) << 16 >> 16;
			n = 0;
			h = 0;
			do {
				l = h << 1;
				k = l + -1 | 0;
				h = b[q >> 1] | 0;
				c = N(h, b[g + (k << 1) >> 1] | 0) | 0;
				h = N(b[f + (k << 1) >> 1] | 0, h) | 0;
				m = l | 1;
				if (p) {
					i = 0;
					e = h;
					j = 0;
					h = 2;
					do {
						v = k - h | 0;
						u = b[a + (h + 1 << 1) >> 1] | 0;
						c = (N(u, b[g + (v << 1) >> 1] | 0) | 0) + c | 0;
						e = (N(b[f + (v << 1) >> 1] | 0, u) | 0) + e | 0;
						v = l - h | 0;
						w = b[g + (v << 1) >> 1] | 0;
						t = b[a + (h << 1) >> 1] | 0;
						c = c + (N(t, w) | 0) | 0;
						v = b[f + (v << 1) >> 1] | 0;
						e = e + (N(v, t) | 0) | 0;
						i = (N(w, u) | 0) + i | 0;
						u = (N(v, u) | 0) + j | 0;
						j = m - h | 0;
						i = i + (N(b[g + (j << 1) >> 1] | 0, t) | 0) | 0;
						j = u + (N(b[f + (j << 1) >> 1] | 0, t) | 0) | 0;
						h = (h << 16) + 131072 >> 16
					} while ((h | 0) < (r | 0))
				} else {
					j = 0;
					i = 0;
					e = h;
					h = 2
				}
				u = l - h | 0;
				w = b[a + (h << 1) >> 1] | 0;
				t = 0 - (c + (N(w, b[g + (u << 1) >> 1] | 0) | 0)) | 0;
				h = m - h | 0;
				v = i + (N(b[g + (h << 1) >> 1] | 0, w) | 0) | 0;
				u = (N(b[f + (u << 1) >> 1] | 0, w) | 0) + e | 0;
				w = (N(b[f + (h << 1) >> 1] | 0, w) | 0) + j | 0;
				u = (b[d + (l << 1) >> 1] << o) + (t >> 11) - (u << 1) | 0;
				h = u << 3;
				u = (h >> 3 | 0) == (u | 0) ? h : u >> 31 ^ 2147483647;
				h = u >> 16;
				b[f + (l << 1) >> 1] = h;
				w = w + (N(h, b[q >> 1] | 0) | 0) | 0;
				h = (u >>> 4) - (h << 12) | 0;
				b[g + (l << 1) >> 1] = h;
				h = 0 - (v + (N(h << 16 >> 16, b[q >> 1] | 0) | 0)) >> 11;
				h = (b[d + (m << 1) >> 1] << o) - (w << 1) + h | 0;
				w = h << 3;
				h = (w >> 3 | 0) == (h | 0) ? w : h >> 31 ^ 2147483647;
				b[f + (m << 1) >> 1] = h >>> 16;
				b[g + (m << 1) >> 1] = (h >>> 4) - (h >> 16 << 12);
				n = n + 1 << 16 >> 16;
				h = n << 16 >> 16
			} while ((s | 0) > (h | 0));
			return
		}

		function Lb(a, c, d, e) {
			a = a | 0;
			c = c | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0;
			b[c >> 1] = b[a >> 1] | 0;
			g = d << 16 >> 16;
			b[c + 2 >> 1] = ((N(b[a + 2 >> 1] | 0, g) | 0) + 16384 | 0) >>> 15;
			if (e << 16 >> 16 <= 1) return;
			f = e & 65535;
			d = g;
			e = 1;
			do {
				h = N(d, g) | 0;
				e = e + 1 | 0;
				d = (h << 1) + 32768 >> 16;
				b[c + (e << 1) >> 1] = ((N(d, b[a + (e << 1) >> 1] | 0) | 0) + 16384 | 0) >>> 15
			} while ((e | 0) != (f | 0));
			return
		}

		function Mb(a) {
			a = a | 0;
			var b = 0,
				d = 0,
				e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0,
				r = 0,
				s = 0,
				t = 0,
				u = 0,
				v = 0,
				w = 0,
				x = 0,
				y = 0;
			y = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			q = y;
			do
				if (a >>> 0 < 245) {
					n = a >>> 0 < 11 ? 16 : a + 11 & -8;
					a = n >>> 3;
					p = c[6025] | 0;
					d = p >>> a;
					if (d & 3 | 0) {
						b = (d & 1 ^ 1) + a | 0;
						a = 24140 + (b << 1 << 2) | 0;
						d = a + 8 | 0;
						e = c[d >> 2] | 0;
						f = e + 8 | 0;
						g = c[f >> 2] | 0;
						if ((g | 0) == (a | 0)) c[6025] = p & ~(1 << b);
						else {
							c[g + 12 >> 2] = a;
							c[d >> 2] = g
						}
						x = b << 3;
						c[e + 4 >> 2] = x | 3;
						x = e + x + 4 | 0;
						c[x >> 2] = c[x >> 2] | 1;
						x = f;
						l = y;
						return x | 0
					}
					o = c[6027] | 0;
					if (n >>> 0 > o >>> 0) {
						if (d | 0) {
							b = 2 << a;
							b = d << a & (b | 0 - b);
							b = (b & 0 - b) + -1 | 0;
							i = b >>> 12 & 16;
							b = b >>> i;
							d = b >>> 5 & 8;
							b = b >>> d;
							g = b >>> 2 & 4;
							b = b >>> g;
							a = b >>> 1 & 2;
							b = b >>> a;
							e = b >>> 1 & 1;
							e = (d | i | g | a | e) + (b >>> e) | 0;
							b = 24140 + (e << 1 << 2) | 0;
							a = b + 8 | 0;
							g = c[a >> 2] | 0;
							i = g + 8 | 0;
							d = c[i >> 2] | 0;
							if ((d | 0) == (b | 0)) {
								a = p & ~(1 << e);
								c[6025] = a
							} else {
								c[d + 12 >> 2] = b;
								c[a >> 2] = d;
								a = p
							}
							x = e << 3;
							h = x - n | 0;
							c[g + 4 >> 2] = n | 3;
							f = g + n | 0;
							c[f + 4 >> 2] = h | 1;
							c[g + x >> 2] = h;
							if (o | 0) {
								e = c[6030] | 0;
								b = o >>> 3;
								d = 24140 + (b << 1 << 2) | 0;
								b = 1 << b;
								if (!(a & b)) {
									c[6025] = a | b;
									b = d;
									a = d + 8 | 0
								} else {
									a = d + 8 | 0;
									b = c[a >> 2] | 0
								}
								c[a >> 2] = e;
								c[b + 12 >> 2] = e;
								c[e + 8 >> 2] = b;
								c[e + 12 >> 2] = d
							}
							c[6027] = h;
							c[6030] = f;
							x = i;
							l = y;
							return x | 0
						}
						j = c[6026] | 0;
						if (j) {
							d = (j & 0 - j) + -1 | 0;
							i = d >>> 12 & 16;
							d = d >>> i;
							h = d >>> 5 & 8;
							d = d >>> h;
							k = d >>> 2 & 4;
							d = d >>> k;
							e = d >>> 1 & 2;
							d = d >>> e;
							a = d >>> 1 & 1;
							a = c[24404 + ((h | i | k | e | a) + (d >>> a) << 2) >> 2] | 0;
							d = (c[a + 4 >> 2] & -8) - n | 0;
							e = c[a + 16 + (((c[a + 16 >> 2] | 0) == 0 & 1) << 2) >> 2] | 0;
							if (!e) {
								k = a;
								h = d
							} else {
								do {
									i = (c[e + 4 >> 2] & -8) - n | 0;
									k = i >>> 0 < d >>> 0;
									d = k ? i : d;
									a = k ? e : a;
									e = c[e + 16 + (((c[e + 16 >> 2] | 0) == 0 & 1) << 2) >> 2] | 0
								} while ((e | 0) != 0);
								k = a;
								h = d
							}
							i = k + n | 0;
							if (i >>> 0 > k >>> 0) {
								f = c[k + 24 >> 2] | 0;
								b = c[k + 12 >> 2] | 0;
								do
									if ((b | 0) == (k | 0)) {
										a = k + 20 | 0;
										b = c[a >> 2] | 0;
										if (!b) {
											a = k + 16 | 0;
											b = c[a >> 2] | 0;
											if (!b) {
												d = 0;
												break
											}
										}
										while (1) {
											d = b + 20 | 0;
											e = c[d >> 2] | 0;
											if (e | 0) {
												b = e;
												a = d;
												continue
											}
											d = b + 16 | 0;
											e = c[d >> 2] | 0;
											if (!e) break;
											else {
												b = e;
												a = d
											}
										}
										c[a >> 2] = 0;
										d = b
									} else {
										d = c[k + 8 >> 2] | 0;
										c[d + 12 >> 2] = b;
										c[b + 8 >> 2] = d;
										d = b
									} while (0);
								do
									if (f | 0) {
										b = c[k + 28 >> 2] | 0;
										a = 24404 + (b << 2) | 0;
										if ((k | 0) == (c[a >> 2] | 0)) {
											c[a >> 2] = d;
											if (!d) {
												c[6026] = j & ~(1 << b);
												break
											}
										} else {
											c[f + 16 + (((c[f + 16 >> 2] | 0) != (k | 0) & 1) << 2) >> 2] = d;
											if (!d) break
										}
										c[d + 24 >> 2] = f;
										b = c[k + 16 >> 2] | 0;
										if (b | 0) {
											c[d + 16 >> 2] = b;
											c[b + 24 >> 2] = d
										}
										b = c[k + 20 >> 2] | 0;
										if (b | 0) {
											c[d + 20 >> 2] = b;
											c[b + 24 >> 2] = d
										}
									} while (0);
								if (h >>> 0 < 16) {
									x = h + n | 0;
									c[k + 4 >> 2] = x | 3;
									x = k + x + 4 | 0;
									c[x >> 2] = c[x >> 2] | 1
								} else {
									c[k + 4 >> 2] = n | 3;
									c[i + 4 >> 2] = h | 1;
									c[i + h >> 2] = h;
									if (o | 0) {
										e = c[6030] | 0;
										b = o >>> 3;
										d = 24140 + (b << 1 << 2) | 0;
										b = 1 << b;
										if (!(p & b)) {
											c[6025] = p | b;
											b = d;
											a = d + 8 | 0
										} else {
											a = d + 8 | 0;
											b = c[a >> 2] | 0
										}
										c[a >> 2] = e;
										c[b + 12 >> 2] = e;
										c[e + 8 >> 2] = b;
										c[e + 12 >> 2] = d
									}
									c[6027] = h;
									c[6030] = i
								}
								x = k + 8 | 0;
								l = y;
								return x | 0
							} else o = n
						} else o = n
					} else o = n
				} else if (a >>> 0 <= 4294967231) {
				a = a + 11 | 0;
				n = a & -8;
				k = c[6026] | 0;
				if (k) {
					e = 0 - n | 0;
					a = a >>> 8;
					if (a)
						if (n >>> 0 > 16777215) j = 31;
						else {
							p = (a + 1048320 | 0) >>> 16 & 8;
							w = a << p;
							o = (w + 520192 | 0) >>> 16 & 4;
							w = w << o;
							j = (w + 245760 | 0) >>> 16 & 2;
							j = 14 - (o | p | j) + (w << j >>> 15) | 0;
							j = n >>> (j + 7 | 0) & 1 | j << 1
						}
					else j = 0;
					d = c[24404 + (j << 2) >> 2] | 0;
					a: do
						if (!d) {
							d = 0;
							a = 0;
							w = 57
						} else {
							a = 0;
							i = d;
							h = n << ((j | 0) == 31 ? 0 : 25 - (j >>> 1) | 0);
							d = 0;
							while (1) {
								f = (c[i + 4 >> 2] & -8) - n | 0;
								if (f >>> 0 < e >>> 0)
									if (!f) {
										e = 0;
										d = i;
										a = i;
										w = 61;
										break a
									} else {
										a = i;
										e = f
									} f = c[i + 20 >> 2] | 0;
								i = c[i + 16 + (h >>> 31 << 2) >> 2] | 0;
								d = (f | 0) == 0 | (f | 0) == (i | 0) ? d : f;
								f = (i | 0) == 0;
								if (f) {
									w = 57;
									break
								} else h = h << ((f ^ 1) & 1)
							}
						}
					while (0);
					if ((w | 0) == 57) {
						if ((d | 0) == 0 & (a | 0) == 0) {
							a = 2 << j;
							a = k & (a | 0 - a);
							if (!a) {
								o = n;
								break
							}
							p = (a & 0 - a) + -1 | 0;
							i = p >>> 12 & 16;
							p = p >>> i;
							h = p >>> 5 & 8;
							p = p >>> h;
							j = p >>> 2 & 4;
							p = p >>> j;
							o = p >>> 1 & 2;
							p = p >>> o;
							d = p >>> 1 & 1;
							a = 0;
							d = c[24404 + ((h | i | j | o | d) + (p >>> d) << 2) >> 2] | 0
						}
						if (!d) {
							i = a;
							h = e
						} else w = 61
					}
					if ((w | 0) == 61)
						while (1) {
							w = 0;
							o = (c[d + 4 >> 2] & -8) - n | 0;
							p = o >>> 0 < e >>> 0;
							e = p ? o : e;
							a = p ? d : a;
							d = c[d + 16 + (((c[d + 16 >> 2] | 0) == 0 & 1) << 2) >> 2] | 0;
							if (!d) {
								i = a;
								h = e;
								break
							} else w = 61
						}
					if ((i | 0) != 0 ? h >>> 0 < ((c[6027] | 0) - n | 0) >>> 0 : 0) {
						g = i + n | 0;
						if (g >>> 0 <= i >>> 0) {
							x = 0;
							l = y;
							return x | 0
						}
						f = c[i + 24 >> 2] | 0;
						b = c[i + 12 >> 2] | 0;
						do
							if ((b | 0) == (i | 0)) {
								a = i + 20 | 0;
								b = c[a >> 2] | 0;
								if (!b) {
									a = i + 16 | 0;
									b = c[a >> 2] | 0;
									if (!b) {
										b = 0;
										break
									}
								}
								while (1) {
									d = b + 20 | 0;
									e = c[d >> 2] | 0;
									if (e | 0) {
										b = e;
										a = d;
										continue
									}
									d = b + 16 | 0;
									e = c[d >> 2] | 0;
									if (!e) break;
									else {
										b = e;
										a = d
									}
								}
								c[a >> 2] = 0
							} else {
								x = c[i + 8 >> 2] | 0;
								c[x + 12 >> 2] = b;
								c[b + 8 >> 2] = x
							} while (0);
						do
							if (f) {
								a = c[i + 28 >> 2] | 0;
								d = 24404 + (a << 2) | 0;
								if ((i | 0) == (c[d >> 2] | 0)) {
									c[d >> 2] = b;
									if (!b) {
										e = k & ~(1 << a);
										c[6026] = e;
										break
									}
								} else {
									c[f + 16 + (((c[f + 16 >> 2] | 0) != (i | 0) & 1) << 2) >> 2] = b;
									if (!b) {
										e = k;
										break
									}
								}
								c[b + 24 >> 2] = f;
								a = c[i + 16 >> 2] | 0;
								if (a | 0) {
									c[b + 16 >> 2] = a;
									c[a + 24 >> 2] = b
								}
								a = c[i + 20 >> 2] | 0;
								if (a) {
									c[b + 20 >> 2] = a;
									c[a + 24 >> 2] = b;
									e = k
								} else e = k
							} else e = k; while (0);
						do
							if (h >>> 0 >= 16) {
								c[i + 4 >> 2] = n | 3;
								c[g + 4 >> 2] = h | 1;
								c[g + h >> 2] = h;
								b = h >>> 3;
								if (h >>> 0 < 256) {
									d = 24140 + (b << 1 << 2) | 0;
									a = c[6025] | 0;
									b = 1 << b;
									if (!(a & b)) {
										c[6025] = a | b;
										b = d;
										a = d + 8 | 0
									} else {
										a = d + 8 | 0;
										b = c[a >> 2] | 0
									}
									c[a >> 2] = g;
									c[b + 12 >> 2] = g;
									c[g + 8 >> 2] = b;
									c[g + 12 >> 2] = d;
									break
								}
								b = h >>> 8;
								if (b)
									if (h >>> 0 > 16777215) b = 31;
									else {
										w = (b + 1048320 | 0) >>> 16 & 8;
										x = b << w;
										v = (x + 520192 | 0) >>> 16 & 4;
										x = x << v;
										b = (x + 245760 | 0) >>> 16 & 2;
										b = 14 - (v | w | b) + (x << b >>> 15) | 0;
										b = h >>> (b + 7 | 0) & 1 | b << 1
									}
								else b = 0;
								d = 24404 + (b << 2) | 0;
								c[g + 28 >> 2] = b;
								a = g + 16 | 0;
								c[a + 4 >> 2] = 0;
								c[a >> 2] = 0;
								a = 1 << b;
								if (!(e & a)) {
									c[6026] = e | a;
									c[d >> 2] = g;
									c[g + 24 >> 2] = d;
									c[g + 12 >> 2] = g;
									c[g + 8 >> 2] = g;
									break
								}
								a = h << ((b | 0) == 31 ? 0 : 25 - (b >>> 1) | 0);
								d = c[d >> 2] | 0;
								while (1) {
									if ((c[d + 4 >> 2] & -8 | 0) == (h | 0)) {
										w = 97;
										break
									}
									e = d + 16 + (a >>> 31 << 2) | 0;
									b = c[e >> 2] | 0;
									if (!b) {
										w = 96;
										break
									} else {
										a = a << 1;
										d = b
									}
								}
								if ((w | 0) == 96) {
									c[e >> 2] = g;
									c[g + 24 >> 2] = d;
									c[g + 12 >> 2] = g;
									c[g + 8 >> 2] = g;
									break
								} else if ((w | 0) == 97) {
									w = d + 8 | 0;
									x = c[w >> 2] | 0;
									c[x + 12 >> 2] = g;
									c[w >> 2] = g;
									c[g + 8 >> 2] = x;
									c[g + 12 >> 2] = d;
									c[g + 24 >> 2] = 0;
									break
								}
							} else {
								x = h + n | 0;
								c[i + 4 >> 2] = x | 3;
								x = i + x + 4 | 0;
								c[x >> 2] = c[x >> 2] | 1
							} while (0);
						x = i + 8 | 0;
						l = y;
						return x | 0
					} else o = n
				} else o = n
			} else o = -1;
			while (0);
			d = c[6027] | 0;
			if (d >>> 0 >= o >>> 0) {
				b = d - o | 0;
				a = c[6030] | 0;
				if (b >>> 0 > 15) {
					x = a + o | 0;
					c[6030] = x;
					c[6027] = b;
					c[x + 4 >> 2] = b | 1;
					c[a + d >> 2] = b;
					c[a + 4 >> 2] = o | 3
				} else {
					c[6027] = 0;
					c[6030] = 0;
					c[a + 4 >> 2] = d | 3;
					x = a + d + 4 | 0;
					c[x >> 2] = c[x >> 2] | 1
				}
				x = a + 8 | 0;
				l = y;
				return x | 0
			}
			i = c[6028] | 0;
			if (i >>> 0 > o >>> 0) {
				v = i - o | 0;
				c[6028] = v;
				x = c[6031] | 0;
				w = x + o | 0;
				c[6031] = w;
				c[w + 4 >> 2] = v | 1;
				c[x + 4 >> 2] = o | 3;
				x = x + 8 | 0;
				l = y;
				return x | 0
			}
			if (!(c[6143] | 0)) {
				c[6145] = 4096;
				c[6144] = 4096;
				c[6146] = -1;
				c[6147] = -1;
				c[6148] = 0;
				c[6136] = 0;
				c[6143] = q & -16 ^ 1431655768;
				a = 4096
			} else a = c[6145] | 0;
			j = o + 48 | 0;
			k = o + 47 | 0;
			h = a + k | 0;
			f = 0 - a | 0;
			n = h & f;
			if (n >>> 0 <= o >>> 0) {
				x = 0;
				l = y;
				return x | 0
			}
			a = c[6135] | 0;
			if (a | 0 ? (p = c[6133] | 0, q = p + n | 0, q >>> 0 <= p >>> 0 | q >>> 0 > a >>> 0) : 0) {
				x = 0;
				l = y;
				return x | 0
			}
			b: do
				if (!(c[6136] & 4)) {
					d = c[6031] | 0;
					c: do
						if (d) {
							e = 24548;
							while (1) {
								a = c[e >> 2] | 0;
								if (a >>> 0 <= d >>> 0 ? (t = e + 4 | 0, (a + (c[t >> 2] | 0) | 0) >>> 0 > d >>> 0) : 0)
									break;
								a = c[e + 8 >> 2] | 0;
								if (!a) {
									w = 118;
									break c
								} else e = a
							}
							b = h - i & f;
							if (b >>> 0 < 2147483647) {
								a = gc(b | 0) | 0;
								if ((a | 0) == ((c[e >> 2] | 0) + (c[t >> 2] | 0) | 0)) {
									if ((a | 0) != (-1 | 0)) {
										h = b;
										g = a;
										w = 135;
										break b
									}
								} else {
									e = a;
									w = 126
								}
							} else b = 0
						} else w = 118; while (0);
					do
						if ((w | 0) == 118) {
							d = gc(0) | 0;
							if ((d | 0) != (-1 | 0) ? (b = d, r = c[6144] | 0, s = r + -1 | 0, b = ((s & b | 0) == 0 ? 0 : (
										s + b & 0 - r) - b | 0) + n | 0, r = c[6133] | 0, s = b + r | 0, b >>> 0 > o >>> 0 & b >>>
									0 < 2147483647) : 0) {
								t = c[6135] | 0;
								if (t | 0 ? s >>> 0 <= r >>> 0 | s >>> 0 > t >>> 0 : 0) {
									b = 0;
									break
								}
								a = gc(b | 0) | 0;
								if ((a | 0) == (d | 0)) {
									h = b;
									g = d;
									w = 135;
									break b
								} else {
									e = a;
									w = 126
								}
							} else b = 0
						} while (0);
					do
						if ((w | 0) == 126) {
							d = 0 - b | 0;
							if (!(j >>> 0 > b >>> 0 & (b >>> 0 < 2147483647 & (e | 0) != (-1 | 0))))
								if ((e | 0) == (-1 | 0)) {
									b = 0;
									break
								} else {
									h = b;
									g = e;
									w = 135;
									break b
								} a = c[6145] | 0;
							a = k - b + a & 0 - a;
							if (a >>> 0 >= 2147483647) {
								h = b;
								g = e;
								w = 135;
								break b
							}
							if ((gc(a | 0) | 0) == (-1 | 0)) {
								gc(d | 0) | 0;
								b = 0;
								break
							} else {
								h = a + b | 0;
								g = e;
								w = 135;
								break b
							}
						} while (0);
					c[6136] = c[6136] | 4;
					w = 133
				} else {
					b = 0;
					w = 133
				}
			while (0);
			if (((w | 0) == 133 ? n >>> 0 < 2147483647 : 0) ? (g = gc(n | 0) | 0, t = gc(0) | 0, u = t - g | 0, v =
					u >>> 0 > (o + 40 | 0) >>> 0, !((g | 0) == (-1 | 0) | v ^ 1 | g >>> 0 < t >>> 0 & ((g | 0) != (-1 |
						0) & (t | 0) != (-1 | 0)) ^ 1)) : 0) {
				h = v ? u : b;
				w = 135
			}
			if ((w | 0) == 135) {
				b = (c[6133] | 0) + h | 0;
				c[6133] = b;
				if (b >>> 0 > (c[6134] | 0) >>> 0) c[6134] = b;
				j = c[6031] | 0;
				do
					if (j) {
						b = 24548;
						while (1) {
							a = c[b >> 2] | 0;
							d = b + 4 | 0;
							e = c[d >> 2] | 0;
							if ((g | 0) == (a + e | 0)) {
								w = 143;
								break
							}
							f = c[b + 8 >> 2] | 0;
							if (!f) break;
							else b = f
						}
						if (((w | 0) == 143 ? (c[b + 12 >> 2] & 8 | 0) == 0 : 0) ? g >>> 0 > j >>> 0 & a >>> 0 <= j >>> 0 :
							0) {
							c[d >> 2] = e + h;
							x = (c[6028] | 0) + h | 0;
							v = j + 8 | 0;
							v = (v & 7 | 0) == 0 ? 0 : 0 - v & 7;
							w = j + v | 0;
							v = x - v | 0;
							c[6031] = w;
							c[6028] = v;
							c[w + 4 >> 2] = v | 1;
							c[j + x + 4 >> 2] = 40;
							c[6032] = c[6147];
							break
						}
						if (g >>> 0 < (c[6029] | 0) >>> 0) c[6029] = g;
						a = g + h | 0;
						b = 24548;
						while (1) {
							if ((c[b >> 2] | 0) == (a | 0)) {
								w = 151;
								break
							}
							b = c[b + 8 >> 2] | 0;
							if (!b) {
								a = 24548;
								break
							}
						}
						if ((w | 0) == 151)
							if (!(c[b + 12 >> 2] & 8)) {
								c[b >> 2] = g;
								n = b + 4 | 0;
								c[n >> 2] = (c[n >> 2] | 0) + h;
								n = g + 8 | 0;
								n = g + ((n & 7 | 0) == 0 ? 0 : 0 - n & 7) | 0;
								b = a + 8 | 0;
								b = a + ((b & 7 | 0) == 0 ? 0 : 0 - b & 7) | 0;
								k = n + o | 0;
								i = b - n - o | 0;
								c[n + 4 >> 2] = o | 3;
								do
									if ((j | 0) != (b | 0)) {
										if ((c[6030] | 0) == (b | 0)) {
											x = (c[6027] | 0) + i | 0;
											c[6027] = x;
											c[6030] = k;
											c[k + 4 >> 2] = x | 1;
											c[k + x >> 2] = x;
											break
										}
										a = c[b + 4 >> 2] | 0;
										if ((a & 3 | 0) == 1) {
											h = a & -8;
											e = a >>> 3;
											d: do
												if (a >>> 0 < 256) {
													a = c[b + 8 >> 2] | 0;
													d = c[b + 12 >> 2] | 0;
													if ((d | 0) == (a | 0)) {
														c[6025] = c[6025] & ~(1 << e);
														break
													} else {
														c[a + 12 >> 2] = d;
														c[d + 8 >> 2] = a;
														break
													}
												} else {
													g = c[b + 24 >> 2] | 0;
													a = c[b + 12 >> 2] | 0;
													do
														if ((a | 0) == (b | 0)) {
															e = b + 16 | 0;
															d = e + 4 | 0;
															a = c[d >> 2] | 0;
															if (!a) {
																a = c[e >> 2] | 0;
																if (!a) {
																	a = 0;
																	break
																} else d = e
															}
															while (1) {
																e = a + 20 | 0;
																f = c[e >> 2] | 0;
																if (f | 0) {
																	a = f;
																	d = e;
																	continue
																}
																e = a + 16 | 0;
																f = c[e >> 2] | 0;
																if (!f) break;
																else {
																	a = f;
																	d = e
																}
															}
															c[d >> 2] = 0
														} else {
															x = c[b + 8 >> 2] | 0;
															c[x + 12 >> 2] = a;
															c[a + 8 >> 2] = x
														} while (0);
													if (!g) break;
													d = c[b + 28 >> 2] | 0;
													e = 24404 + (d << 2) | 0;
													do
														if ((c[e >> 2] | 0) != (b | 0)) {
															c[g + 16 + (((c[g + 16 >> 2] | 0) != (b | 0) & 1) << 2) >> 2] = a;
															if (!a) break d
														} else {
															c[e >> 2] = a;
															if (a | 0) break;
															c[6026] = c[6026] & ~(1 << d);
															break d
														} while (0);
													c[a + 24 >> 2] = g;
													d = b + 16 | 0;
													e = c[d >> 2] | 0;
													if (e | 0) {
														c[a + 16 >> 2] = e;
														c[e + 24 >> 2] = a
													}
													d = c[d + 4 >> 2] | 0;
													if (!d) break;
													c[a + 20 >> 2] = d;
													c[d + 24 >> 2] = a
												}
											while (0);
											b = b + h | 0;
											f = h + i | 0
										} else f = i;
										b = b + 4 | 0;
										c[b >> 2] = c[b >> 2] & -2;
										c[k + 4 >> 2] = f | 1;
										c[k + f >> 2] = f;
										b = f >>> 3;
										if (f >>> 0 < 256) {
											d = 24140 + (b << 1 << 2) | 0;
											a = c[6025] | 0;
											b = 1 << b;
											if (!(a & b)) {
												c[6025] = a | b;
												b = d;
												a = d + 8 | 0
											} else {
												a = d + 8 | 0;
												b = c[a >> 2] | 0
											}
											c[a >> 2] = k;
											c[b + 12 >> 2] = k;
											c[k + 8 >> 2] = b;
											c[k + 12 >> 2] = d;
											break
										}
										b = f >>> 8;
										do
											if (!b) b = 0;
											else {
												if (f >>> 0 > 16777215) {
													b = 31;
													break
												}
												w = (b + 1048320 | 0) >>> 16 & 8;
												x = b << w;
												v = (x + 520192 | 0) >>> 16 & 4;
												x = x << v;
												b = (x + 245760 | 0) >>> 16 & 2;
												b = 14 - (v | w | b) + (x << b >>> 15) | 0;
												b = f >>> (b + 7 | 0) & 1 | b << 1
											} while (0);
										e = 24404 + (b << 2) | 0;
										c[k + 28 >> 2] = b;
										a = k + 16 | 0;
										c[a + 4 >> 2] = 0;
										c[a >> 2] = 0;
										a = c[6026] | 0;
										d = 1 << b;
										if (!(a & d)) {
											c[6026] = a | d;
											c[e >> 2] = k;
											c[k + 24 >> 2] = e;
											c[k + 12 >> 2] = k;
											c[k + 8 >> 2] = k;
											break
										}
										a = f << ((b | 0) == 31 ? 0 : 25 - (b >>> 1) | 0);
										d = c[e >> 2] | 0;
										while (1) {
											if ((c[d + 4 >> 2] & -8 | 0) == (f | 0)) {
												w = 192;
												break
											}
											e = d + 16 + (a >>> 31 << 2) | 0;
											b = c[e >> 2] | 0;
											if (!b) {
												w = 191;
												break
											} else {
												a = a << 1;
												d = b
											}
										}
										if ((w | 0) == 191) {
											c[e >> 2] = k;
											c[k + 24 >> 2] = d;
											c[k + 12 >> 2] = k;
											c[k + 8 >> 2] = k;
											break
										} else if ((w | 0) == 192) {
											w = d + 8 | 0;
											x = c[w >> 2] | 0;
											c[x + 12 >> 2] = k;
											c[w >> 2] = k;
											c[k + 8 >> 2] = x;
											c[k + 12 >> 2] = d;
											c[k + 24 >> 2] = 0;
											break
										}
									} else {
										x = (c[6028] | 0) + i | 0;
										c[6028] = x;
										c[6031] = k;
										c[k + 4 >> 2] = x | 1
									} while (0);
								x = n + 8 | 0;
								l = y;
								return x | 0
							} else a = 24548;
						while (1) {
							b = c[a >> 2] | 0;
							if (b >>> 0 <= j >>> 0 ? (x = b + (c[a + 4 >> 2] | 0) | 0, x >>> 0 > j >>> 0) : 0) break;
							a = c[a + 8 >> 2] | 0
						}
						f = x + -47 | 0;
						a = f + 8 | 0;
						a = f + ((a & 7 | 0) == 0 ? 0 : 0 - a & 7) | 0;
						f = j + 16 | 0;
						a = a >>> 0 < f >>> 0 ? j : a;
						b = a + 8 | 0;
						d = h + -40 | 0;
						v = g + 8 | 0;
						v = (v & 7 | 0) == 0 ? 0 : 0 - v & 7;
						w = g + v | 0;
						v = d - v | 0;
						c[6031] = w;
						c[6028] = v;
						c[w + 4 >> 2] = v | 1;
						c[g + d + 4 >> 2] = 40;
						c[6032] = c[6147];
						d = a + 4 | 0;
						c[d >> 2] = 27;
						c[b >> 2] = c[6137];
						c[b + 4 >> 2] = c[6138];
						c[b + 8 >> 2] = c[6139];
						c[b + 12 >> 2] = c[6140];
						c[6137] = g;
						c[6138] = h;
						c[6140] = 0;
						c[6139] = b;
						b = a + 24 | 0;
						do {
							w = b;
							b = b + 4 | 0;
							c[b >> 2] = 7
						} while ((w + 8 | 0) >>> 0 < x >>> 0);
						if ((a | 0) != (j | 0)) {
							g = a - j | 0;
							c[d >> 2] = c[d >> 2] & -2;
							c[j + 4 >> 2] = g | 1;
							c[a >> 2] = g;
							b = g >>> 3;
							if (g >>> 0 < 256) {
								d = 24140 + (b << 1 << 2) | 0;
								a = c[6025] | 0;
								b = 1 << b;
								if (!(a & b)) {
									c[6025] = a | b;
									b = d;
									a = d + 8 | 0
								} else {
									a = d + 8 | 0;
									b = c[a >> 2] | 0
								}
								c[a >> 2] = j;
								c[b + 12 >> 2] = j;
								c[j + 8 >> 2] = b;
								c[j + 12 >> 2] = d;
								break
							}
							b = g >>> 8;
							if (b)
								if (g >>> 0 > 16777215) d = 31;
								else {
									w = (b + 1048320 | 0) >>> 16 & 8;
									x = b << w;
									v = (x + 520192 | 0) >>> 16 & 4;
									x = x << v;
									d = (x + 245760 | 0) >>> 16 & 2;
									d = 14 - (v | w | d) + (x << d >>> 15) | 0;
									d = g >>> (d + 7 | 0) & 1 | d << 1
								}
							else d = 0;
							e = 24404 + (d << 2) | 0;
							c[j + 28 >> 2] = d;
							c[j + 20 >> 2] = 0;
							c[f >> 2] = 0;
							b = c[6026] | 0;
							a = 1 << d;
							if (!(b & a)) {
								c[6026] = b | a;
								c[e >> 2] = j;
								c[j + 24 >> 2] = e;
								c[j + 12 >> 2] = j;
								c[j + 8 >> 2] = j;
								break
							}
							a = g << ((d | 0) == 31 ? 0 : 25 - (d >>> 1) | 0);
							d = c[e >> 2] | 0;
							while (1) {
								if ((c[d + 4 >> 2] & -8 | 0) == (g | 0)) {
									w = 213;
									break
								}
								e = d + 16 + (a >>> 31 << 2) | 0;
								b = c[e >> 2] | 0;
								if (!b) {
									w = 212;
									break
								} else {
									a = a << 1;
									d = b
								}
							}
							if ((w | 0) == 212) {
								c[e >> 2] = j;
								c[j + 24 >> 2] = d;
								c[j + 12 >> 2] = j;
								c[j + 8 >> 2] = j;
								break
							} else if ((w | 0) == 213) {
								w = d + 8 | 0;
								x = c[w >> 2] | 0;
								c[x + 12 >> 2] = j;
								c[w >> 2] = j;
								c[j + 8 >> 2] = x;
								c[j + 12 >> 2] = d;
								c[j + 24 >> 2] = 0;
								break
							}
						}
					} else {
						x = c[6029] | 0;
						if ((x | 0) == 0 | g >>> 0 < x >>> 0) c[6029] = g;
						c[6137] = g;
						c[6138] = h;
						c[6140] = 0;
						c[6034] = c[6143];
						c[6033] = -1;
						c[6038] = 24140;
						c[6037] = 24140;
						c[6040] = 24148;
						c[6039] = 24148;
						c[6042] = 24156;
						c[6041] = 24156;
						c[6044] = 24164;
						c[6043] = 24164;
						c[6046] = 24172;
						c[6045] = 24172;
						c[6048] = 24180;
						c[6047] = 24180;
						c[6050] = 24188;
						c[6049] = 24188;
						c[6052] = 24196;
						c[6051] = 24196;
						c[6054] = 24204;
						c[6053] = 24204;
						c[6056] = 24212;
						c[6055] = 24212;
						c[6058] = 24220;
						c[6057] = 24220;
						c[6060] = 24228;
						c[6059] = 24228;
						c[6062] = 24236;
						c[6061] = 24236;
						c[6064] = 24244;
						c[6063] = 24244;
						c[6066] = 24252;
						c[6065] = 24252;
						c[6068] = 24260;
						c[6067] = 24260;
						c[6070] = 24268;
						c[6069] = 24268;
						c[6072] = 24276;
						c[6071] = 24276;
						c[6074] = 24284;
						c[6073] = 24284;
						c[6076] = 24292;
						c[6075] = 24292;
						c[6078] = 24300;
						c[6077] = 24300;
						c[6080] = 24308;
						c[6079] = 24308;
						c[6082] = 24316;
						c[6081] = 24316;
						c[6084] = 24324;
						c[6083] = 24324;
						c[6086] = 24332;
						c[6085] = 24332;
						c[6088] = 24340;
						c[6087] = 24340;
						c[6090] = 24348;
						c[6089] = 24348;
						c[6092] = 24356;
						c[6091] = 24356;
						c[6094] = 24364;
						c[6093] = 24364;
						c[6096] = 24372;
						c[6095] = 24372;
						c[6098] = 24380;
						c[6097] = 24380;
						c[6100] = 24388;
						c[6099] = 24388;
						x = h + -40 | 0;
						v = g + 8 | 0;
						v = (v & 7 | 0) == 0 ? 0 : 0 - v & 7;
						w = g + v | 0;
						v = x - v | 0;
						c[6031] = w;
						c[6028] = v;
						c[w + 4 >> 2] = v | 1;
						c[g + x + 4 >> 2] = 40;
						c[6032] = c[6147]
					} while (0);
				b = c[6028] | 0;
				if (b >>> 0 > o >>> 0) {
					v = b - o | 0;
					c[6028] = v;
					x = c[6031] | 0;
					w = x + o | 0;
					c[6031] = w;
					c[w + 4 >> 2] = v | 1;
					c[x + 4 >> 2] = o | 3;
					x = x + 8 | 0;
					l = y;
					return x | 0
				}
			}
			c[(Rb() | 0) >> 2] = 12;
			x = 0;
			l = y;
			return x | 0
		}

		function Nb(a) {
			a = a | 0;
			var b = 0,
				d = 0,
				e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0;
			if (!a) return;
			d = a + -8 | 0;
			f = c[6029] | 0;
			a = c[a + -4 >> 2] | 0;
			b = a & -8;
			j = d + b | 0;
			do
				if (!(a & 1)) {
					e = c[d >> 2] | 0;
					if (!(a & 3)) return;
					h = d + (0 - e) | 0;
					g = e + b | 0;
					if (h >>> 0 < f >>> 0) return;
					if ((c[6030] | 0) == (h | 0)) {
						a = j + 4 | 0;
						b = c[a >> 2] | 0;
						if ((b & 3 | 0) != 3) {
							i = h;
							b = g;
							break
						}
						c[6027] = g;
						c[a >> 2] = b & -2;
						c[h + 4 >> 2] = g | 1;
						c[h + g >> 2] = g;
						return
					}
					d = e >>> 3;
					if (e >>> 0 < 256) {
						a = c[h + 8 >> 2] | 0;
						b = c[h + 12 >> 2] | 0;
						if ((b | 0) == (a | 0)) {
							c[6025] = c[6025] & ~(1 << d);
							i = h;
							b = g;
							break
						} else {
							c[a + 12 >> 2] = b;
							c[b + 8 >> 2] = a;
							i = h;
							b = g;
							break
						}
					}
					f = c[h + 24 >> 2] | 0;
					a = c[h + 12 >> 2] | 0;
					do
						if ((a | 0) == (h | 0)) {
							d = h + 16 | 0;
							b = d + 4 | 0;
							a = c[b >> 2] | 0;
							if (!a) {
								a = c[d >> 2] | 0;
								if (!a) {
									a = 0;
									break
								} else b = d
							}
							while (1) {
								d = a + 20 | 0;
								e = c[d >> 2] | 0;
								if (e | 0) {
									a = e;
									b = d;
									continue
								}
								d = a + 16 | 0;
								e = c[d >> 2] | 0;
								if (!e) break;
								else {
									a = e;
									b = d
								}
							}
							c[b >> 2] = 0
						} else {
							i = c[h + 8 >> 2] | 0;
							c[i + 12 >> 2] = a;
							c[a + 8 >> 2] = i
						} while (0);
					if (f) {
						b = c[h + 28 >> 2] | 0;
						d = 24404 + (b << 2) | 0;
						if ((c[d >> 2] | 0) == (h | 0)) {
							c[d >> 2] = a;
							if (!a) {
								c[6026] = c[6026] & ~(1 << b);
								i = h;
								b = g;
								break
							}
						} else {
							c[f + 16 + (((c[f + 16 >> 2] | 0) != (h | 0) & 1) << 2) >> 2] = a;
							if (!a) {
								i = h;
								b = g;
								break
							}
						}
						c[a + 24 >> 2] = f;
						b = h + 16 | 0;
						d = c[b >> 2] | 0;
						if (d | 0) {
							c[a + 16 >> 2] = d;
							c[d + 24 >> 2] = a
						}
						b = c[b + 4 >> 2] | 0;
						if (b) {
							c[a + 20 >> 2] = b;
							c[b + 24 >> 2] = a;
							i = h;
							b = g
						} else {
							i = h;
							b = g
						}
					} else {
						i = h;
						b = g
					}
				} else {
					i = d;
					h = d
				} while (0);
			if (h >>> 0 >= j >>> 0) return;
			a = j + 4 | 0;
			e = c[a >> 2] | 0;
			if (!(e & 1)) return;
			if (!(e & 2)) {
				if ((c[6031] | 0) == (j | 0)) {
					j = (c[6028] | 0) + b | 0;
					c[6028] = j;
					c[6031] = i;
					c[i + 4 >> 2] = j | 1;
					if ((i | 0) != (c[6030] | 0)) return;
					c[6030] = 0;
					c[6027] = 0;
					return
				}
				if ((c[6030] | 0) == (j | 0)) {
					j = (c[6027] | 0) + b | 0;
					c[6027] = j;
					c[6030] = h;
					c[i + 4 >> 2] = j | 1;
					c[h + j >> 2] = j;
					return
				}
				f = (e & -8) + b | 0;
				d = e >>> 3;
				do
					if (e >>> 0 < 256) {
						b = c[j + 8 >> 2] | 0;
						a = c[j + 12 >> 2] | 0;
						if ((a | 0) == (b | 0)) {
							c[6025] = c[6025] & ~(1 << d);
							break
						} else {
							c[b + 12 >> 2] = a;
							c[a + 8 >> 2] = b;
							break
						}
					} else {
						g = c[j + 24 >> 2] | 0;
						a = c[j + 12 >> 2] | 0;
						do
							if ((a | 0) == (j | 0)) {
								d = j + 16 | 0;
								b = d + 4 | 0;
								a = c[b >> 2] | 0;
								if (!a) {
									a = c[d >> 2] | 0;
									if (!a) {
										d = 0;
										break
									} else b = d
								}
								while (1) {
									d = a + 20 | 0;
									e = c[d >> 2] | 0;
									if (e | 0) {
										a = e;
										b = d;
										continue
									}
									d = a + 16 | 0;
									e = c[d >> 2] | 0;
									if (!e) break;
									else {
										a = e;
										b = d
									}
								}
								c[b >> 2] = 0;
								d = a
							} else {
								d = c[j + 8 >> 2] | 0;
								c[d + 12 >> 2] = a;
								c[a + 8 >> 2] = d;
								d = a
							} while (0);
						if (g | 0) {
							a = c[j + 28 >> 2] | 0;
							b = 24404 + (a << 2) | 0;
							if ((c[b >> 2] | 0) == (j | 0)) {
								c[b >> 2] = d;
								if (!d) {
									c[6026] = c[6026] & ~(1 << a);
									break
								}
							} else {
								c[g + 16 + (((c[g + 16 >> 2] | 0) != (j | 0) & 1) << 2) >> 2] = d;
								if (!d) break
							}
							c[d + 24 >> 2] = g;
							a = j + 16 | 0;
							b = c[a >> 2] | 0;
							if (b | 0) {
								c[d + 16 >> 2] = b;
								c[b + 24 >> 2] = d
							}
							a = c[a + 4 >> 2] | 0;
							if (a | 0) {
								c[d + 20 >> 2] = a;
								c[a + 24 >> 2] = d
							}
						}
					} while (0);
				c[i + 4 >> 2] = f | 1;
				c[h + f >> 2] = f;
				if ((i | 0) == (c[6030] | 0)) {
					c[6027] = f;
					return
				}
			} else {
				c[a >> 2] = e & -2;
				c[i + 4 >> 2] = b | 1;
				c[h + b >> 2] = b;
				f = b
			}
			a = f >>> 3;
			if (f >>> 0 < 256) {
				d = 24140 + (a << 1 << 2) | 0;
				b = c[6025] | 0;
				a = 1 << a;
				if (!(b & a)) {
					c[6025] = b | a;
					a = d;
					b = d + 8 | 0
				} else {
					b = d + 8 | 0;
					a = c[b >> 2] | 0
				}
				c[b >> 2] = i;
				c[a + 12 >> 2] = i;
				c[i + 8 >> 2] = a;
				c[i + 12 >> 2] = d;
				return
			}
			a = f >>> 8;
			if (a)
				if (f >>> 0 > 16777215) a = 31;
				else {
					h = (a + 1048320 | 0) >>> 16 & 8;
					j = a << h;
					g = (j + 520192 | 0) >>> 16 & 4;
					j = j << g;
					a = (j + 245760 | 0) >>> 16 & 2;
					a = 14 - (g | h | a) + (j << a >>> 15) | 0;
					a = f >>> (a + 7 | 0) & 1 | a << 1
				}
			else a = 0;
			e = 24404 + (a << 2) | 0;
			c[i + 28 >> 2] = a;
			c[i + 20 >> 2] = 0;
			c[i + 16 >> 2] = 0;
			b = c[6026] | 0;
			d = 1 << a;
			do
				if (b & d) {
					b = f << ((a | 0) == 31 ? 0 : 25 - (a >>> 1) | 0);
					d = c[e >> 2] | 0;
					while (1) {
						if ((c[d + 4 >> 2] & -8 | 0) == (f | 0)) {
							a = 73;
							break
						}
						e = d + 16 + (b >>> 31 << 2) | 0;
						a = c[e >> 2] | 0;
						if (!a) {
							a = 72;
							break
						} else {
							b = b << 1;
							d = a
						}
					}
					if ((a | 0) == 72) {
						c[e >> 2] = i;
						c[i + 24 >> 2] = d;
						c[i + 12 >> 2] = i;
						c[i + 8 >> 2] = i;
						break
					} else if ((a | 0) == 73) {
						h = d + 8 | 0;
						j = c[h >> 2] | 0;
						c[j + 12 >> 2] = i;
						c[h >> 2] = i;
						c[i + 8 >> 2] = j;
						c[i + 12 >> 2] = d;
						c[i + 24 >> 2] = 0;
						break
					}
				} else {
					c[6026] = b | d;
					c[e >> 2] = i;
					c[i + 24 >> 2] = e;
					c[i + 12 >> 2] = i;
					c[i + 8 >> 2] = i
				} while (0);
			j = (c[6033] | 0) + -1 | 0;
			c[6033] = j;
			if (!j) a = 24556;
			else return;
			while (1) {
				a = c[a >> 2] | 0;
				if (!a) break;
				else a = a + 8 | 0
			}
			c[6033] = -1;
			return
		}

		function Ob(a) {
			a = a | 0;
			var b = 0,
				d = 0;
			b = l;
			l = l + 16 | 0;
			if ((l | 0) >= (m | 0)) W(16);
			d = b;
			c[d >> 2] = Sb(c[a + 60 >> 2] | 0) | 0;
			a = Qb(ea(6, d | 0) | 0) | 0;
			l = b;
			return a | 0
		}

		function Pb(a, b, d) {
			a = a | 0;
			b = b | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0;
			f = l;
			l = l + 32 | 0;
			if ((l | 0) >= (m | 0)) W(32);
			g = f;
			e = f + 20 | 0;
			c[g >> 2] = c[a + 60 >> 2];
			c[g + 4 >> 2] = 0;
			c[g + 8 >> 2] = b;
			c[g + 12 >> 2] = e;
			c[g + 16 >> 2] = d;
			if ((Qb(ba(140, g | 0) | 0) | 0) < 0) {
				c[e >> 2] = -1;
				a = -1
			} else a = c[e >> 2] | 0;
			l = f;
			return a | 0
		}

		function Qb(a) {
			a = a | 0;
			if (a >>> 0 > 4294963200) {
				c[(Rb() | 0) >> 2] = 0 - a;
				a = -1
			}
			return a | 0
		}

		function Rb() {
			return 24596
		}

		function Sb(a) {
			a = a | 0;
			return a | 0
		}

		function Tb(b, d, e) {
			b = b | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0;
			g = l;
			l = l + 32 | 0;
			if ((l | 0) >= (m | 0)) W(32);
			f = g;
			c[b + 36 >> 2] = 3;
			if ((c[b >> 2] & 64 | 0) == 0 ? (c[f >> 2] = c[b + 60 >> 2], c[f + 4 >> 2] = 21523, c[f + 8 >> 2] = g +
					16, da(54, f | 0) | 0) : 0) a[b + 75 >> 0] = -1;
			f = Ub(b, d, e) | 0;
			l = g;
			return f | 0
		}

		function Ub(a, b, d) {
			a = a | 0;
			b = b | 0;
			d = d | 0;
			var e = 0,
				f = 0,
				g = 0,
				h = 0,
				i = 0,
				j = 0,
				k = 0,
				n = 0,
				o = 0,
				p = 0,
				q = 0;
			o = l;
			l = l + 48 | 0;
			if ((l | 0) >= (m | 0)) W(48);
			k = o + 16 | 0;
			g = o;
			f = o + 32 | 0;
			i = a + 28 | 0;
			e = c[i >> 2] | 0;
			c[f >> 2] = e;
			j = a + 20 | 0;
			e = (c[j >> 2] | 0) - e | 0;
			c[f + 4 >> 2] = e;
			c[f + 8 >> 2] = b;
			c[f + 12 >> 2] = d;
			e = e + d | 0;
			h = a + 60 | 0;
			c[g >> 2] = c[h >> 2];
			c[g + 4 >> 2] = f;
			c[g + 8 >> 2] = 2;
			g = Qb(ca(146, g | 0) | 0) | 0;
			a: do
				if ((e | 0) != (g | 0)) {
					b = 2;
					while (1) {
						if ((g | 0) < 0) break;
						e = e - g | 0;
						q = c[f + 4 >> 2] | 0;
						p = g >>> 0 > q >>> 0;
						f = p ? f + 8 | 0 : f;
						b = b + (p << 31 >> 31) | 0;
						q = g - (p ? q : 0) | 0;
						c[f >> 2] = (c[f >> 2] | 0) + q;
						p = f + 4 | 0;
						c[p >> 2] = (c[p >> 2] | 0) - q;
						c[k >> 2] = c[h >> 2];
						c[k + 4 >> 2] = f;
						c[k + 8 >> 2] = b;
						g = Qb(ca(146, k | 0) | 0) | 0;
						if ((e | 0) == (g | 0)) {
							n = 3;
							break a
						}
					}
					c[a + 16 >> 2] = 0;
					c[i >> 2] = 0;
					c[j >> 2] = 0;
					c[a >> 2] = c[a >> 2] | 32;
					if ((b | 0) == 2) d = 0;
					else d = d - (c[f + 4 >> 2] | 0) | 0
				} else n = 3; while (0);
			if ((n | 0) == 3) {
				q = c[a + 44 >> 2] | 0;
				c[a + 16 >> 2] = q + (c[a + 48 >> 2] | 0);
				c[i >> 2] = q;
				c[j >> 2] = q
			}
			l = o;
			return d | 0
		}

		function Vb(a) {
			a = a | 0;
			return 0
		}

		function Wb(a) {
			a = a | 0;
			return
		}

		function Xb() {
			$(24600);
			return 24608
		}

		function Yb() {
			fa(24600);
			return
		}

		function Zb(a) {
			a = a | 0;
			var b = 0,
				d = 0;
			do
				if (a) {
					if ((c[a + 76 >> 2] | 0) <= -1) {
						b = _b(a) | 0;
						break
					}
					d = (Vb(a) | 0) == 0;
					b = _b(a) | 0;
					if (!d) Wb(a)
				} else {
					if (!(c[59] | 0)) b = 0;
					else b = Zb(c[59] | 0) | 0;
					a = c[(Xb() | 0) >> 2] | 0;
					if (a)
						do {
							if ((c[a + 76 >> 2] | 0) > -1) d = Vb(a) | 0;
							else d = 0;
							if ((c[a + 20 >> 2] | 0) >>> 0 > (c[a + 28 >> 2] | 0) >>> 0) b = _b(a) | 0 | b;
							if (d | 0) Wb(a);
							a = c[a + 56 >> 2] | 0
						} while ((a | 0) != 0);
					Yb()
				} while (0);
			return b | 0
		}

		function _b(a) {
			a = a | 0;
			var b = 0,
				d = 0,
				e = 0,
				f = 0,
				g = 0,
				h = 0;
			b = a + 20 | 0;
			h = a + 28 | 0;
			if ((c[b >> 2] | 0) >>> 0 > (c[h >> 2] | 0) >>> 0 ? (ka[c[a + 36 >> 2] & 3](a, 0, 0) | 0, (c[b >> 2] |
					0) == 0) : 0) a = -1;
			else {
				d = a + 4 | 0;
				e = c[d >> 2] | 0;
				f = a + 8 | 0;
				g = c[f >> 2] | 0;
				if (e >>> 0 < g >>> 0) ka[c[a + 40 >> 2] & 3](a, e - g | 0, 1) | 0;
				c[a + 16 >> 2] = 0;
				c[h >> 2] = 0;
				c[b >> 2] = 0;
				c[f >> 2] = 0;
				c[d >> 2] = 0;
				a = 0
			}
			return a | 0
		}

		function $b() {}

		function ac(a, b) {
			a = a | 0;
			b = b | 0;
			var c = 0,
				d = 0,
				e = 0,
				f = 0;
			f = a & 65535;
			e = b & 65535;
			c = N(e, f) | 0;
			d = a >>> 16;
			a = (c >>> 16) + (N(e, d) | 0) | 0;
			e = b >>> 16;
			b = N(e, f) | 0;
			return (y = (a >>> 16) + (N(e, d) | 0) + (((a & 65535) + b | 0) >>> 16) | 0, a + b << 16 | c & 65535 |
				0) | 0
		}

		function bc(a, b, c, d) {
			a = a | 0;
			b = b | 0;
			c = c | 0;
			d = d | 0;
			var e = 0,
				f = 0;
			e = a;
			f = c;
			c = ac(e, f) | 0;
			a = y;
			return (y = (N(b, f) | 0) + (N(d, e) | 0) + a | a & 0, c | 0 | 0) | 0
		}

		function cc(a, b, c) {
			a = a | 0;
			b = b | 0;
			c = c | 0;
			if ((c | 0) < 32) {
				y = b >>> c;
				return a >>> c | (b & (1 << c) - 1) << 32 - c
			}
			y = 0;
			return b >>> c - 32 | 0
		}

		function dc(a, b, c) {
			a = a | 0;
			b = b | 0;
			c = c | 0;
			if ((c | 0) < 32) {
				y = b << c | (a & (1 << c) - 1 << 32 - c) >>> 32 - c;
				return a << c
			}
			y = a << c - 32;
			return 0
		}

		function ec(b, d, e) {
			b = b | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0;
			if ((e | 0) >= 8192) return ga(b | 0, d | 0, e | 0) | 0;
			h = b | 0;
			g = b + e | 0;
			if ((b & 3) == (d & 3)) {
				while (b & 3) {
					if (!e) return h | 0;
					a[b >> 0] = a[d >> 0] | 0;
					b = b + 1 | 0;
					d = d + 1 | 0;
					e = e - 1 | 0
				}
				e = g & -4 | 0;
				f = e - 64 | 0;
				while ((b | 0) <= (f | 0)) {
					c[b >> 2] = c[d >> 2];
					c[b + 4 >> 2] = c[d + 4 >> 2];
					c[b + 8 >> 2] = c[d + 8 >> 2];
					c[b + 12 >> 2] = c[d + 12 >> 2];
					c[b + 16 >> 2] = c[d + 16 >> 2];
					c[b + 20 >> 2] = c[d + 20 >> 2];
					c[b + 24 >> 2] = c[d + 24 >> 2];
					c[b + 28 >> 2] = c[d + 28 >> 2];
					c[b + 32 >> 2] = c[d + 32 >> 2];
					c[b + 36 >> 2] = c[d + 36 >> 2];
					c[b + 40 >> 2] = c[d + 40 >> 2];
					c[b + 44 >> 2] = c[d + 44 >> 2];
					c[b + 48 >> 2] = c[d + 48 >> 2];
					c[b + 52 >> 2] = c[d + 52 >> 2];
					c[b + 56 >> 2] = c[d + 56 >> 2];
					c[b + 60 >> 2] = c[d + 60 >> 2];
					b = b + 64 | 0;
					d = d + 64 | 0
				}
				while ((b | 0) < (e | 0)) {
					c[b >> 2] = c[d >> 2];
					b = b + 4 | 0;
					d = d + 4 | 0
				}
			} else {
				e = g - 4 | 0;
				while ((b | 0) < (e | 0)) {
					a[b >> 0] = a[d >> 0] | 0;
					a[b + 1 >> 0] = a[d + 1 >> 0] | 0;
					a[b + 2 >> 0] = a[d + 2 >> 0] | 0;
					a[b + 3 >> 0] = a[d + 3 >> 0] | 0;
					b = b + 4 | 0;
					d = d + 4 | 0
				}
			}
			while ((b | 0) < (g | 0)) {
				a[b >> 0] = a[d >> 0] | 0;
				b = b + 1 | 0;
				d = d + 1 | 0
			}
			return h | 0
		}

		function fc(b, d, e) {
			b = b | 0;
			d = d | 0;
			e = e | 0;
			var f = 0,
				g = 0,
				h = 0,
				i = 0;
			h = b + e | 0;
			d = d & 255;
			if ((e | 0) >= 67) {
				while (b & 3) {
					a[b >> 0] = d;
					b = b + 1 | 0
				}
				f = h & -4 | 0;
				g = f - 64 | 0;
				i = d | d << 8 | d << 16 | d << 24;
				while ((b | 0) <= (g | 0)) {
					c[b >> 2] = i;
					c[b + 4 >> 2] = i;
					c[b + 8 >> 2] = i;
					c[b + 12 >> 2] = i;
					c[b + 16 >> 2] = i;
					c[b + 20 >> 2] = i;
					c[b + 24 >> 2] = i;
					c[b + 28 >> 2] = i;
					c[b + 32 >> 2] = i;
					c[b + 36 >> 2] = i;
					c[b + 40 >> 2] = i;
					c[b + 44 >> 2] = i;
					c[b + 48 >> 2] = i;
					c[b + 52 >> 2] = i;
					c[b + 56 >> 2] = i;
					c[b + 60 >> 2] = i;
					b = b + 64 | 0
				}
				while ((b | 0) < (f | 0)) {
					c[b >> 2] = i;
					b = b + 4 | 0
				}
			}
			while ((b | 0) < (h | 0)) {
				a[b >> 0] = d;
				b = b + 1 | 0
			}
			return h - e | 0
		}

		function gc(a) {
			a = a | 0;
			var b = 0,
				d = 0;
			d = c[i >> 2] | 0;
			b = d + a | 0;
			if ((a | 0) > 0 & (b | 0) < (d | 0) | (b | 0) < 0) {
				V() | 0;
				aa(12);
				return -1
			}
			c[i >> 2] = b;
			if ((b | 0) > (U() | 0) ? (T() | 0) == 0 : 0) {
				c[i >> 2] = d;
				aa(12);
				return -1
			}
			return d | 0
		}

		function hc(a, b) {
			a = a | 0;
			b = b | 0;
			return ja[a & 1](b | 0) | 0
		}

		function ic(a, b, c, d) {
			a = a | 0;
			b = b | 0;
			c = c | 0;
			d = d | 0;
			return ka[a & 3](b | 0, c | 0, d | 0) | 0
		}

		function jc(a) {
			a = a | 0;
			X(0);
			return 0
		}

		function kc(a, b, c) {
			a = a | 0;
			b = b | 0;
			c = c | 0;
			Y(1);
			return 0
		}

		// EMSCRIPTEN_END_FUNCS
		var ja = [jc, Ob];
		var ka = [kc, Tb, Pb, Ub];
		return {
			_D_IF_decode: ua,
			_D_IF_exit: ta,
			_D_IF_init: sa,
			___errno_location: Rb,
			___muldi3: bc,
			_bitshift64Lshr: cc,
			_bitshift64Shl: dc,
			_fflush: Zb,
			_free: Nb,
			_malloc: Mb,
			_memcpy: ec,
			_memset: fc,
			_sbrk: gc,
			dynCall_ii: hc,
			dynCall_iiii: ic,
			establishStackSpace: oa,
			getTempRet0: ra,
			runPostSets: $b,
			setTempRet0: qa,
			setThrew: pa,
			stackAlloc: la,
			stackRestore: na,
			stackSave: ma
		}
	})


	// EMSCRIPTEN_END_ASM
	(Module.asmGlobalArg, Module.asmLibraryArg, buffer);
	var real__D_IF_decode = asm["_D_IF_decode"];
	asm["_D_IF_decode"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__D_IF_decode.apply(null, arguments)
	});
	var real__D_IF_exit = asm["_D_IF_exit"];
	asm["_D_IF_exit"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__D_IF_exit.apply(null, arguments)
	});
	var real__D_IF_init = asm["_D_IF_init"];
	asm["_D_IF_init"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__D_IF_init.apply(null, arguments)
	});
	var real____errno_location = asm["___errno_location"];
	asm["___errno_location"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real____errno_location.apply(null, arguments)
	});
	var real____muldi3 = asm["___muldi3"];
	asm["___muldi3"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real____muldi3.apply(null, arguments)
	});
	var real__bitshift64Lshr = asm["_bitshift64Lshr"];
	asm["_bitshift64Lshr"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__bitshift64Lshr.apply(null, arguments)
	});
	var real__bitshift64Shl = asm["_bitshift64Shl"];
	asm["_bitshift64Shl"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__bitshift64Shl.apply(null, arguments)
	});
	var real__fflush = asm["_fflush"];
	asm["_fflush"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__fflush.apply(null, arguments)
	});
	var real__free = asm["_free"];
	asm["_free"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__free.apply(null, arguments)
	});
	var real__malloc = asm["_malloc"];
	asm["_malloc"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__malloc.apply(null, arguments)
	});
	var real__sbrk = asm["_sbrk"];
	asm["_sbrk"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real__sbrk.apply(null, arguments)
	});
	var real_establishStackSpace = asm["establishStackSpace"];
	asm["establishStackSpace"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real_establishStackSpace.apply(null, arguments)
	});
	var real_getTempRet0 = asm["getTempRet0"];
	asm["getTempRet0"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real_getTempRet0.apply(null, arguments)
	});
	var real_setTempRet0 = asm["setTempRet0"];
	asm["setTempRet0"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real_setTempRet0.apply(null, arguments)
	});
	var real_setThrew = asm["setThrew"];
	asm["setThrew"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real_setThrew.apply(null, arguments)
	});
	var real_stackAlloc = asm["stackAlloc"];
	asm["stackAlloc"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real_stackAlloc.apply(null, arguments)
	});
	var real_stackRestore = asm["stackRestore"];
	asm["stackRestore"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real_stackRestore.apply(null, arguments)
	});
	var real_stackSave = asm["stackSave"];
	asm["stackSave"] = (function() {
		assert(runtimeInitialized,
			"you need to wait for the runtime to be ready (e.g. wait for main() to be called)");
		assert(!runtimeExited, "the runtime was exited (use NO_EXIT_RUNTIME to keep it alive after main() exits)");
		return real_stackSave.apply(null, arguments)
	});
	var _D_IF_decode = Module["_D_IF_decode"] = asm["_D_IF_decode"];
	var _D_IF_exit = Module["_D_IF_exit"] = asm["_D_IF_exit"];
	var _D_IF_init = Module["_D_IF_init"] = asm["_D_IF_init"];
	var ___errno_location = Module["___errno_location"] = asm["___errno_location"];
	var ___muldi3 = Module["___muldi3"] = asm["___muldi3"];
	var _bitshift64Lshr = Module["_bitshift64Lshr"] = asm["_bitshift64Lshr"];
	var _bitshift64Shl = Module["_bitshift64Shl"] = asm["_bitshift64Shl"];
	var _fflush = Module["_fflush"] = asm["_fflush"];
	var _free = Module["_free"] = asm["_free"];
	var _malloc = Module["_malloc"] = asm["_malloc"];
	var _memcpy = Module["_memcpy"] = asm["_memcpy"];
	var _memset = Module["_memset"] = asm["_memset"];
	var _sbrk = Module["_sbrk"] = asm["_sbrk"];
	var establishStackSpace = Module["establishStackSpace"] = asm["establishStackSpace"];
	var getTempRet0 = Module["getTempRet0"] = asm["getTempRet0"];
	var runPostSets = Module["runPostSets"] = asm["runPostSets"];
	var setTempRet0 = Module["setTempRet0"] = asm["setTempRet0"];
	var setThrew = Module["setThrew"] = asm["setThrew"];
	var stackAlloc = Module["stackAlloc"] = asm["stackAlloc"];
	var stackRestore = Module["stackRestore"] = asm["stackRestore"];
	var stackSave = Module["stackSave"] = asm["stackSave"];
	var dynCall_ii = Module["dynCall_ii"] = asm["dynCall_ii"];
	var dynCall_iiii = Module["dynCall_iiii"] = asm["dynCall_iiii"];
	Module["asm"] = asm;
	if (!Module["intArrayFromString"]) Module["intArrayFromString"] = (function() {
		abort("'intArrayFromString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["intArrayToString"]) Module["intArrayToString"] = (function() {
		abort("'intArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["ccall"]) Module["ccall"] = (function() {
		abort("'ccall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["cwrap"]) Module["cwrap"] = (function() {
		abort("'cwrap' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["setValue"]) Module["setValue"] = (function() {
		abort("'setValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["getValue"]) Module["getValue"] = (function() {
		abort("'getValue' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["allocate"]) Module["allocate"] = (function() {
		abort("'allocate' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["getMemory"]) Module["getMemory"] = (function() {
		abort(
			"'getMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["Pointer_stringify"]) Module["Pointer_stringify"] = (function() {
		abort("'Pointer_stringify' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["AsciiToString"]) Module["AsciiToString"] = (function() {
		abort("'AsciiToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["stringToAscii"]) Module["stringToAscii"] = (function() {
		abort("'stringToAscii' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["UTF8ArrayToString"]) Module["UTF8ArrayToString"] = (function() {
		abort("'UTF8ArrayToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["UTF8ToString"]) Module["UTF8ToString"] = (function() {
		abort("'UTF8ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["stringToUTF8Array"]) Module["stringToUTF8Array"] = (function() {
		abort("'stringToUTF8Array' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["stringToUTF8"]) Module["stringToUTF8"] = (function() {
		abort("'stringToUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["lengthBytesUTF8"]) Module["lengthBytesUTF8"] = (function() {
		abort("'lengthBytesUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["UTF16ToString"]) Module["UTF16ToString"] = (function() {
		abort("'UTF16ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["stringToUTF16"]) Module["stringToUTF16"] = (function() {
		abort("'stringToUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["lengthBytesUTF16"]) Module["lengthBytesUTF16"] = (function() {
		abort("'lengthBytesUTF16' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["UTF32ToString"]) Module["UTF32ToString"] = (function() {
		abort("'UTF32ToString' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["stringToUTF32"]) Module["stringToUTF32"] = (function() {
		abort("'stringToUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["lengthBytesUTF32"]) Module["lengthBytesUTF32"] = (function() {
		abort("'lengthBytesUTF32' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["allocateUTF8"]) Module["allocateUTF8"] = (function() {
		abort("'allocateUTF8' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["stackTrace"]) Module["stackTrace"] = (function() {
		abort("'stackTrace' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["addOnPreRun"]) Module["addOnPreRun"] = (function() {
		abort("'addOnPreRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["addOnInit"]) Module["addOnInit"] = (function() {
		abort("'addOnInit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["addOnPreMain"]) Module["addOnPreMain"] = (function() {
		abort("'addOnPreMain' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["addOnExit"]) Module["addOnExit"] = (function() {
		abort("'addOnExit' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["addOnPostRun"]) Module["addOnPostRun"] = (function() {
		abort("'addOnPostRun' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["writeStringToMemory"]) Module["writeStringToMemory"] = (function() {
		abort("'writeStringToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["writeArrayToMemory"]) Module["writeArrayToMemory"] = (function() {
		abort("'writeArrayToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["writeAsciiToMemory"]) Module["writeAsciiToMemory"] = (function() {
		abort("'writeAsciiToMemory' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["addRunDependency"]) Module["addRunDependency"] = (function() {
		abort(
			"'addRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["removeRunDependency"]) Module["removeRunDependency"] = (function() {
		abort(
			"'removeRunDependency' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS"]) Module["FS"] = (function() {
		abort("'FS' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["FS_createFolder"]) Module["FS_createFolder"] = (function() {
		abort(
			"'FS_createFolder' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS_createPath"]) Module["FS_createPath"] = (function() {
		abort(
			"'FS_createPath' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS_createDataFile"]) Module["FS_createDataFile"] = (function() {
		abort(
			"'FS_createDataFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS_createPreloadedFile"]) Module["FS_createPreloadedFile"] = (function() {
		abort(
			"'FS_createPreloadedFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS_createLazyFile"]) Module["FS_createLazyFile"] = (function() {
		abort(
			"'FS_createLazyFile' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS_createLink"]) Module["FS_createLink"] = (function() {
		abort(
			"'FS_createLink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS_createDevice"]) Module["FS_createDevice"] = (function() {
		abort(
			"'FS_createDevice' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["FS_unlink"]) Module["FS_unlink"] = (function() {
		abort(
			"'FS_unlink' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ). Alternatively, forcing filesystem support (-s FORCE_FILESYSTEM=1) can export this for you"
			)
	});
	if (!Module["GL"]) Module["GL"] = (function() {
		abort("'GL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["staticAlloc"]) Module["staticAlloc"] = (function() {
		abort("'staticAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["dynamicAlloc"]) Module["dynamicAlloc"] = (function() {
		abort("'dynamicAlloc' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["warnOnce"]) Module["warnOnce"] = (function() {
		abort("'warnOnce' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["loadDynamicLibrary"]) Module["loadDynamicLibrary"] = (function() {
		abort("'loadDynamicLibrary' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["loadWebAssemblyModule"]) Module["loadWebAssemblyModule"] = (function() {
		abort("'loadWebAssemblyModule' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["getLEB"]) Module["getLEB"] = (function() {
		abort("'getLEB' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["getFunctionTables"]) Module["getFunctionTables"] = (function() {
		abort("'getFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["alignFunctionTables"]) Module["alignFunctionTables"] = (function() {
		abort("'alignFunctionTables' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["registerFunctions"]) Module["registerFunctions"] = (function() {
		abort("'registerFunctions' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["addFunction"]) Module["addFunction"] = (function() {
		abort("'addFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["removeFunction"]) Module["removeFunction"] = (function() {
		abort("'removeFunction' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["getFuncWrapper"]) Module["getFuncWrapper"] = (function() {
		abort("'getFuncWrapper' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["prettyPrint"]) Module["prettyPrint"] = (function() {
		abort("'prettyPrint' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["makeBigInt"]) Module["makeBigInt"] = (function() {
		abort("'makeBigInt' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["dynCall"]) Module["dynCall"] = (function() {
		abort("'dynCall' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["getCompilerSetting"]) Module["getCompilerSetting"] = (function() {
		abort("'getCompilerSetting' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["intArrayFromBase64"]) Module["intArrayFromBase64"] = (function() {
		abort("'intArrayFromBase64' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["tryParseAsDataURI"]) Module["tryParseAsDataURI"] = (function() {
		abort("'tryParseAsDataURI' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
	});
	if (!Module["ALLOC_NORMAL"]) Object.defineProperty(Module, "ALLOC_NORMAL", {
		get: (function() {
			abort("'ALLOC_NORMAL' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
		})
	});
	if (!Module["ALLOC_STACK"]) Object.defineProperty(Module, "ALLOC_STACK", {
		get: (function() {
			abort("'ALLOC_STACK' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
		})
	});
	if (!Module["ALLOC_STATIC"]) Object.defineProperty(Module, "ALLOC_STATIC", {
		get: (function() {
			abort("'ALLOC_STATIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
		})
	});
	if (!Module["ALLOC_DYNAMIC"]) Object.defineProperty(Module, "ALLOC_DYNAMIC", {
		get: (function() {
			abort("'ALLOC_DYNAMIC' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
		})
	});
	if (!Module["ALLOC_NONE"]) Object.defineProperty(Module, "ALLOC_NONE", {
		get: (function() {
			abort("'ALLOC_NONE' was not exported. add it to EXTRA_EXPORTED_RUNTIME_METHODS (see the FAQ)")
		})
	});
	if (memoryInitializer) {
		if (!isDataURI(memoryInitializer)) {
			if (typeof Module["locateFile"] === "function") {
				memoryInitializer = Module["locateFile"](memoryInitializer)
			} else if (Module["memoryInitializerPrefixURL"]) {
				memoryInitializer = Module["memoryInitializerPrefixURL"] + memoryInitializer
			}
		}
		if (ENVIRONMENT_IS_NODE || ENVIRONMENT_IS_SHELL) {
			var data = Module["readBinary"](memoryInitializer);
			HEAPU8.set(data, GLOBAL_BASE)
		} else {
			addRunDependency("memory initializer");
			var applyMemoryInitializer = (function(data) {
				if (data.byteLength) data = new Uint8Array(data);
				for (var i = 0; i < data.length; i++) {
					assert(HEAPU8[GLOBAL_BASE + i] === 0,
						"area for memory initializer should not have been touched before it's loaded")
				}
				HEAPU8.set(data, GLOBAL_BASE);
				if (Module["memoryInitializerRequest"]) delete Module["memoryInitializerRequest"].response;
				removeRunDependency("memory initializer")
			});

			function doBrowserLoad() {
				Module["readAsync"](memoryInitializer, applyMemoryInitializer, (function() {
					throw "could not load memory initializer " + memoryInitializer
				}))
			}
			var memoryInitializerBytes = tryParseAsDataURI(memoryInitializer);
			if (memoryInitializerBytes) {
				applyMemoryInitializer(memoryInitializerBytes.buffer)
			} else if (Module["memoryInitializerRequest"]) {
				function useRequest() {
					var request = Module["memoryInitializerRequest"];
					var response = request.response;
					if (request.status !== 200 && request.status !== 0) {
						var data = tryParseAsDataURI(Module["memoryInitializerRequestURL"]);
						if (data) {
							response = data.buffer
						} else {
							console.warn("a problem seems to have happened with Module.memoryInitializerRequest, status: " +
								request.status + ", retrying " + memoryInitializer);
							doBrowserLoad();
							return
						}
					}
					applyMemoryInitializer(response)
				}
				if (Module["memoryInitializerRequest"].response) {
					setTimeout(useRequest, 0)
				} else {
					Module["memoryInitializerRequest"].addEventListener("load", useRequest)
				}
			} else {
				doBrowserLoad()
			}
		}
	}

	function ExitStatus(status) {
		this.name = "ExitStatus";
		this.message = "Program terminated with exit(" + status + ")";
		this.status = status
	}
	ExitStatus.prototype = new Error;
	ExitStatus.prototype.constructor = ExitStatus;
	var initialStackTop;
	dependenciesFulfilled = function runCaller() {
		if (!Module["calledRun"]) run();
		if (!Module["calledRun"]) dependenciesFulfilled = runCaller
	};

	function run(args) {
		args = args || Module["arguments"];
		if (runDependencies > 0) {
			return
		}
		writeStackCookie();
		preRun();
		if (runDependencies > 0) return;
		if (Module["calledRun"]) return;

		function doRun() {
			if (Module["calledRun"]) return;
			Module["calledRun"] = true;
			if (ABORT) return;
			ensureInitRuntime();
			preMain();
			if (Module["onRuntimeInitialized"]) Module["onRuntimeInitialized"]();
			assert(!Module["_main"],
				'compiled without a main, but one is present. if you added it from JS, use Module["onRuntimeInitialized"]'
				);
			postRun()
		}
		if (Module["setStatus"]) {
			Module["setStatus"]("Running...");
			setTimeout((function() {
				setTimeout((function() {
					Module["setStatus"]("")
				}), 1);
				doRun()
			}), 1)
		} else {
			doRun()
		}
		checkStackCookie()
	}
	Module["run"] = run;

	function checkUnflushedContent() {
		var print = Module["print"];
		var printErr = Module["printErr"];
		var has = false;
		Module["print"] = Module["printErr"] = (function(x) {
			has = true
		});
		try {
			var flush = flush_NO_FILESYSTEM;
			if (flush) flush(0)
		} catch (e) {}
		Module["print"] = print;
		Module["printErr"] = printErr;
		if (has) {
			warnOnce(
				"stdio streams had content in them that was not flushed. you should set NO_EXIT_RUNTIME to 0 (see the FAQ), or make sure to emit a newline when you printf etc."
				)
		}
	}

	function exit(status, implicit) {
		checkUnflushedContent();
		if (implicit && Module["noExitRuntime"] && status === 0) {
			return
		}
		if (Module["noExitRuntime"]) {
			if (!implicit) {
				Module.printErr("exit(" + status +
					") called, but NO_EXIT_RUNTIME is set, so halting execution but not exiting the runtime or preventing further async execution (build with NO_EXIT_RUNTIME=0, if you want a true shutdown)"
					)
			}
		} else {
			ABORT = true;
			EXITSTATUS = status;
			STACKTOP = initialStackTop;
			exitRuntime();
			if (Module["onExit"]) Module["onExit"](status)
		}
		if (ENVIRONMENT_IS_NODE) {
			process["exit"](status)
		}
		Module["quit"](status, new ExitStatus(status))
	}
	Module["exit"] = exit;
	var abortDecorators = [];

	function abort(what) {
		if (Module["onAbort"]) {
			Module["onAbort"](what)
		}
		if (what !== undefined) {
			Module.print(what);
			Module.printErr(what);
			what = JSON.stringify(what)
		} else {
			what = ""
		}
		ABORT = true;
		EXITSTATUS = 1;
		var extra = "";
		var output = "abort(" + what + ") at " + stackTrace() + extra;
		if (abortDecorators) {
			abortDecorators.forEach((function(decorator) {
				output = decorator(output, what)
			}))
		}
		throw output
	}
	Module["abort"] = abort;
	if (Module["preInit"]) {
		if (typeof Module["preInit"] == "function") Module["preInit"] = [Module["preInit"]];
		while (Module["preInit"].length > 0) {
			Module["preInit"].pop()()
		}
	}
	Module["noExitRuntime"] = true;
	run();
	return AMRWB
})()