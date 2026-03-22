declare module 'red5pro-webrtc-sdk' {
  export class Red5ProMediaPlayer {
    constructor();

    attachVideo(videoElement: HTMLVideoElement): void;

    init(config: {
      host: string;
      app: string;
      protocol: string;
      port: number;
      streamName: string;
    }): Promise<void>;

    play(): Promise<void>;
    stop(): void;

    addEventListener(
      event: 'SubscriptionEvent.Subscribed' | 'SubscriptionEvent.Failed' | string, 
      callback: (event: any) => void
    ): void;
    removeEventListener(event: string, callback: (event: any) => void): void;
  }
}