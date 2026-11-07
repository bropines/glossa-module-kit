// Editor types for Glossa JavaScript modules (module protocol version 1).
//
// Glossa runs a module's main.js in its built-in engine and calls the
// functions it defines (as globals or on `module.exports`):
//
//   function translate(req, host) { … }   // capability "translate"
//   function detect(req, host) { … }      // capability "detect_language"
//   function dictionary(req, host) { … }  // capability "dictionary"
//   function speak(req, host) { … }       // capability "listen"
//   function recognize(req, host) { … }   // capability "ocr"
//
// Point your editor at this file (a jsconfig.json "include", or
// `/// <reference path="glossa.d.ts" />`) and annotate the functions with
// JSDoc: `@param {Glossa.TranslateRequest} req`, `@param {Glossa.Host} host`.
//
// These types describe what Glossa's runtime provides; they are checked by
// hand against crates/glossa-modules/src/runtime/js (glossa.js, prelude.js)
// and docs/modules/js-modules.md, protocol.md and ocr-modules.md in
// https://github.com/bropines/glossa. They are a convenience for editors and
// are not loaded by Glossa. When they and the docs disagree, the docs win.

declare namespace Glossa {
  /** A BCP 47 language code (`en`, `zh-Hans`, `pt-BR`); `auto` as a source means "detect it". */
  type Lang = string;

  /** The module's settings from `[[options]]` in module.toml, with defaults filled in. */
  type Options = Record<string, any>;

  /** Error kinds Glossa understands (docs/modules/protocol.md, "Errors"). */
  type ErrorKind =
    | "missing_credential" // a required setting is empty or rejected; message = the option key
    | "rate_limited"
    | "not_found"
    | "source_language"
    | "target_language"
    | "unsupported"
    | "bad_request"
    | "bad_response"
    | "http"
    | "network"
    | "other";

  // -- requests ----------------------------------------------------------

  interface GlossaryTerm {
    source: string;
    target: string;
  }

  interface TranslateRequest {
    text: string;
    from: Lang;
    to: Lang;
    /** A hint (e.g. `formal`) a service may ignore. */
    style?: string;
    /** Terms to keep; a hint a service may ignore. */
    glossary?: GlossaryTerm[];
    options: Options;
  }

  interface DetectRequest {
    text: string;
    options: Options;
  }

  interface DictionaryRequest {
    text: string;
    from: Lang;
    to: Lang;
    /** Ask for the headword only, no fuzzy matches. */
    exact: boolean;
    options: Options;
  }

  interface SpeakRequest {
    text: string;
    lang: Lang;
    /** The slower second reading. */
    slow: boolean;
    options: Options;
  }

  interface RecognizeRequest {
    /** The picture: PNG, JPEG or WebP, base64-encoded. */
    image_base64: string;
    /** The same picture registered with the image API for this call. Absent from older hosts. */
    image_handle?: number;
    lang: Lang;
    /** Set when the user asked to recognise and translate in one go. */
    translate_to?: Lang;
    /** How much structure the caller wants; more is always fine. Absent from older hosts. */
    granularity?: "full_text" | "blocks" | "lines" | "words";
    preserve_line_breaks: boolean;
    options: Options;
  }

  // -- results -----------------------------------------------------------

  interface Sense {
    word: string;
    back_translations?: string[];
  }

  interface PartOfSpeech {
    part_of_speech: string;
    senses: Sense[];
  }

  /** What `translate` returns; a bare string is accepted as `{ text }`. */
  interface TranslateResult {
    /** Never empty: throw a ModuleError instead. */
    text: string;
    /** The detected source language, when `from` was `auto`. */
    detected_from?: Lang | null;
    romanization?: string | null;
    alternatives?: string[];
    /** A dictionary block for single words, shown under the translation. */
    parts_of_speech?: PartOfSpeech[];
  }

  interface DetectResult {
    lang: Lang;
    /** 0–1; defaults to 1. */
    confidence?: number;
  }

  interface Pronunciation {
    region?: string;
    symbol?: string;
    audio_url?: string | null;
  }

  /** pot-app's names (`trait`, `explains`); `part_of_speech` / `definitions` are accepted too. */
  interface Explanation {
    trait?: string;
    explains?: string[];
    part_of_speech?: string;
    definitions?: string[];
  }

  interface Example {
    source: string;
    target?: string;
  }

  /** What `dictionary` returns. */
  interface Article {
    headword: string;
    pronunciations?: Pronunciation[];
    explanations?: Explanation[];
    examples?: Example[];
    /** Accepted as another name for `examples`. */
    sentence?: Example[];
    associations?: string[];
    /** Ready HTML; Glossa simplifies it to its own styling. */
    html?: string | null;
    link?: string | null;
  }

  /** What `speak` returns. */
  interface SpeakResult {
    audio_base64: string;
    /** `audio/mpeg`, `audio/wav` or `audio/ogg` play everywhere. */
    mime: string;
  }

  /** `{x, y, width, height}` in pixels of the input image. */
  interface Rect {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  /** An affine map `[a, b, c, d, e, f]`: x' = a·x + b·y + c, y' = d·x + e·y + f. */
  type Transform = [number, number, number, number, number, number];

  /** One region of a recognition result (docs/modules/ocr-modules.md). */
  interface OcrNode {
    text?: string;
    level?: "block" | "paragraph" | "line" | "word";
    /** The box as if the text were level, about its centre. */
    bounds?: Rect;
    /** `[x0, y0, x1, y1]`, used when `bounds` is absent. */
    bbox?: [number, number, number, number];
    /** Radians, clockwise on screen, about the box's centre. */
    angle?: number;
    polygon?: [number, number][];
    /** 0–1. */
    confidence?: number;
    /** For lines: y = slope·x + offset from the line box's bottom-left corner. */
    baseline?: { slope: number; offset: number };
    lang?: Lang;
    direction?: "ltr" | "rtl" | "ttb";
    translation?: string;
    children?: OcrNode[];
  }

  /** What `recognize` returns. */
  interface RecognizeResult {
    /** May be empty when `blocks`, `hocr` or `alto` carries the result. */
    text: string;
    translation?: string | null;
    detected_lang?: Lang | null;
    blocks?: OcrNode[];
    /** `[width, height]` of the input, if given. */
    image_size?: [number, number];
    hocr?: string | null;
    alto?: string | null;
    /** The coordinates belong to a prepared copy; Glossa maps them back. */
    transform?: Transform | null;
  }

  // -- the host ----------------------------------------------------------

  interface FetchInit {
    /** Default `GET`. */
    method?: string;
    headers?: Record<string, string | number | boolean>;
    /** Sent as JSON, with `Content-Type: application/json` unless given. */
    json?: unknown;
    /** Sent URL-encoded, with the form content type unless given. */
    form?: Record<string, string | number | boolean>;
    /** A text body. */
    body?: string;
    /** Milliseconds. Keep it under Glossa's call budget (30 s by default). */
    timeout?: number;
    /** Return the body base64-encoded in `body_base64` (audio, images). */
    binary?: boolean;
  }

  interface FetchResponse {
    status: number;
    /** `status` is 2xx. A non-2xx status is returned, not thrown. */
    ok: boolean;
    /** Lower-case names; repeated headers joined with `\n`. */
    headers: Record<string, string>;
    body: string;
    body_base64?: string | null;
    text(): string;
    /** The body parsed; throws a `bad_response` ModuleError when it is not JSON. */
    json(): any;
  }

  /** The raw `http` host call (docs/modules/protocol.md, "http"). */
  interface HttpRequest {
    method?: string;
    url: string;
    headers?: Record<string, string>;
    body?: string | null;
    /** Binary data to send; wins over `body`. */
    body_base64?: string | null;
    timeout_ms?: number | null;
    binary?: boolean;
  }

  interface HttpResponse {
    status: number;
    headers: Record<string, string>;
    body: string;
    body_base64?: string | null;
  }

  type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

  interface Cache {
    /** The stored value, or null. */
    get(key: string): any;
    /** Keep a JSON value for `ttlSecs` seconds (0 or omitted: until Glossa exits). */
    set(key: string, value: unknown, ttlSecs?: number): void;
  }

  /** Where the files from the manifest's `[[assets]]` are. */
  interface Assets {
    dir: string;
    /** Downloaded and verified assets by name: a file, or the folder an archive was unpacked into. */
    files: Record<string, string>;
    /** Optional assets not downloaded yet. */
    missing?: string[];
  }

  /** What every image operation returns. */
  interface ImageInfo {
    handle: number;
    width: number;
    height: number;
    /** 1 (grey) or 4 (RGBA). */
    channels: number;
    /** Maps this image's pixels back to the original. */
    transform: Transform;
    format?: string;
    /** From `encode`, `pixels`. */
    data_base64?: string;
    /** From `encode`. */
    mime?: string;
    /** From `threshold`: the level used. */
    threshold?: number;
    /** From `deskew`: the rotation applied, degrees clockwise. */
    angle?: number;
    /** From `split_tiles`. */
    tiles?: ImageInfo[];
  }

  /** An image: a handle, an info object from another operation, or parameters carrying `handle` / `data_base64`. */
  type ImageSource = number | ImageInfo | { handle?: number; data_base64?: string; [k: string]: unknown } | null | undefined;

  /** `"#rrggbb"`, `"#rrggbbaa"`, `"#rgb"`, `white`, `black`, `transparent`, `red`, `[r, g, b]`, `[r, g, b, a]` or a grey level. */
  type Color = string | number | [number, number, number] | [number, number, number, number];

  type ImageOp<P = Record<string, unknown>> = (src?: ImageSource, params?: P) => ImageInfo;

  interface ResizeParams {
    scale?: number;
    max_side?: number;
    width?: number;
    height?: number;
    mode?: "fit" | "fill" | "exact";
    filter?: "nearest" | "bilinear" | "bicubic" | "lanczos";
  }

  /** The image API (docs/modules/ocr-modules.md, "The image API"). Images live until the call returns. */
  interface ImageApi {
    /** Any operation by name: `host.image.call("crop", { handle: 1, x: 0, … })`. */
    call(op: string, params?: Record<string, unknown>): ImageInfo;
    /** Register encoded bytes (base64) and get a handle. */
    fromBase64(b64: string): ImageInfo;
    /** A box of a derived image as the axis-aligned box in the original (returned in the same shape). */
    mapBoxBack<B extends Rect | [number, number, number, number]>(box: B, transform: Transform | ImageInfo | null | undefined): B;

    decode: ImageOp<{ data_base64?: string }>;
    info: ImageOp<{}>;
    encode: ImageOp<{ format?: "png" | "jpeg" | "webp"; quality?: number }>;
    to_base64: ImageApi["encode"];
    toBase64: ImageApi["encode"];
    pixels: ImageOp<{}>;
    free: ImageOp<{}>;
    new: ImageOp<{ width: number; height: number; color?: Color }>;
    crop: ImageOp<{ x: number; y: number; width: number; height: number }>;
    resize: ImageOp<ResizeParams>;
    scale_to_min_height: ImageOp<{ min_height?: number; max_side?: number; filter?: ResizeParams["filter"] }>;
    scaleToMinHeight: ImageApi["scale_to_min_height"];
    rotate: ImageOp<{ angle: number; background?: Color; expand?: boolean }>;
    flip: ImageOp<{ direction?: "horizontal" | "vertical" }>;
    grayscale: ImageOp<{}>;
    invert: ImageOp<{}>;
    threshold: ImageOp<{ value?: number | "otsu" }>;
    adaptive_threshold: ImageOp<{ block_size?: number; c?: number }>;
    adaptiveThreshold: ImageApi["adaptive_threshold"];
    adjust: ImageOp<{ contrast?: number; brightness?: number; gamma?: number }>;
    normalize: ImageOp<{ cutoff?: number }>;
    auto_levels: ImageApi["normalize"];
    autoLevels: ImageApi["normalize"];
    blur: ImageOp<{ radius?: number; kind?: "gaussian" | "box" }>;
    sharpen: ImageOp<{ amount?: number; radius?: number }>;
    pad: ImageOp<{ all?: number; top?: number; right?: number; bottom?: number; left?: number; color?: Color }>;
    deskew: ImageOp<{ max_angle?: number; background?: Color }>;
    split_tiles: ImageOp<{ max_width?: number; max_height?: number; overlap?: number }>;
    splitTiles: ImageApi["split_tiles"];
    paste: ImageOp<{ source: number; x: number; y: number }>;
    composite: ImageApi["paste"];
    draw_rect: ImageOp<{ x: number; y: number; width: number; height: number; color?: Color; thickness?: number }>;
    drawRect: ImageApi["draw_rect"];
  }

  /** The `host` argument (also a global). Every call is synchronous. */
  interface Host {
    /**
     * An HTTP request made by Glossa: the user's proxy, Glossa's timeouts and
     * retries, and only the hosts in `[permissions] network`. Synchronous.
     */
    fetch(url: string, init?: FetchInit): FetchResponse;
    /** The raw `http` host call, for full control. */
    http(req: HttpRequest): HttpResponse;
    /** Glossa's log, tagged with the module id; `glossa-cli -v` prints it. One argument logs at `info`. */
    log(message: string): void;
    log(level: LogLevel, message: string): void;
    /** A small store that outlives the call: keep tokens here, not in globals. */
    cache: Cache;
    /** Where the `[[assets]]` files are. A Glossa without asset support answers `unsupported`. */
    assets(): Assets;
    /** One asset's path, or null when the manifest declares none by that name. */
    assetPath(name: string): string | null;
    /** The module's settings, the same object as `req.options`. */
    options: Options;
    /** Image preprocessing on handles, for OCR modules. */
    image: ImageApi;
  }

  /** The functions a module may define. Each may be `async`. */
  interface ModuleExports {
    translate?(req: TranslateRequest, host: Host): TranslateResult | string | Promise<TranslateResult | string>;
    detect?(req: DetectRequest, host: Host): DetectResult | Promise<DetectResult>;
    dictionary?(req: DictionaryRequest, host: Host): Article | Promise<Article>;
    speak?(req: SpeakRequest, host: Host): SpeakResult | Promise<SpeakResult>;
    recognize?(req: RecognizeRequest, host: Host): RecognizeResult | Promise<RecognizeResult>;
  }
}

/** A typed failure: Glossa tells the user what to fix, or moves on to the next service. */
declare class ModuleError extends Error {
  constructor(kind: Glossa.ErrorKind, message?: string);
  readonly kind: Glossa.ErrorKind;
}

/** The host, also passed as the second argument. */
declare var host: Glossa.Host;

/** Functions may be defined here instead of as globals. */
declare var module: { exports: Glossa.ModuleExports };
declare var exports: Glossa.ModuleExports;

/** Goes to Glossa's log: `log`/`info` at info, `debug`, `warn`, `error`. */
declare var console: {
  log(...args: unknown[]): void;
  info(...args: unknown[]): void;
  debug(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
};

declare function btoa(s: string): string;
declare function atob(s: string): string;

/** UTF-8 only. */
declare class TextEncoder {
  encode(s: string): Uint8Array;
}
/** UTF-8 only. */
declare class TextDecoder {
  decode(bytes?: ArrayLike<number>): string;
}

/** Runs the callback on the next microtask: there is no event loop between calls, so it does not wait. */
declare function setTimeout(fn: (...args: any[]) => void, ms?: number, ...args: any[]): number;
declare function clearTimeout(id?: number): void;
