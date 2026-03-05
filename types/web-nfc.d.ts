
interface NDEFMessage {
  records: NDEFRecord[];
}

interface NDEFRecord {
  recordType: string;
  mediaType?: string;
  data: ArrayBuffer | DataView | string;
}

interface NDEFReadingEvent extends Event {
  message: NDEFMessage;
  serialNumber?: string;
}

interface NDEFReader extends EventTarget {
  scan(): Promise<void>;
  write(message: NDEFMessage, options?: NDEFWriteOptions): Promise<void>;
    makeReadOnly(options?: { signal?: AbortSignal }): Promise<void>;
  addEventListener(
    type: "reading" | "readingerror",
    listener: (event: NDEFReadingEvent | ErrorEvent) => void
  ): void;
  removeEventListener(
    type: "reading" | "readingerror",
    listener: (event: NDEFReadingEvent | ErrorEvent) => void
  ): void;
}

interface NDEFWriteOptions {
  overwrite?: boolean;
  signal?: AbortSignal;
}

declare var NDEFReader: {
  prototype: NDEFReader;
  new (): NDEFReader;
};

interface Window {
  NDEFReader?: typeof NDEFReader;
}
