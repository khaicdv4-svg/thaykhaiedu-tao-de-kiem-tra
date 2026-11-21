declare module 'word-extractor' {
  interface TaiLieuWord {
    getBody(): string;
  }
  export default class WordExtractor {
    extract(nguon: string | Buffer): Promise<TaiLieuWord>;
  }
}
