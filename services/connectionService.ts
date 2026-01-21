
import { ConnectionStatus, PeerMessage } from '../types';

export interface NearbyDevice {
  id: string;
  name: string;
  type: 'WIFI' | 'BT';
}

/**
 * ConnectionService 处理设备间的 P2P 传输
 */
export class ConnectionService {
  private rtcPeerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private bluetoothDevice: any | null = null;

  // 模拟发现附近的设备
  public async discoverNearbyDevices(): Promise<NearbyDevice[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve([
          { id: 'dev-1', name: "Nebula Phone (XiaoMing)", type: 'WIFI' },
          { id: 'dev-2', name: "Galaxy Tablet", type: 'WIFI' },
          { id: 'dev-3', name: "Bluetooth Speaker Pro", type: 'BT' }
        ]);
      }, 1500);
    });
  }

  public async startWiFiP2P(
    deviceId: string, 
    onStatusChange: (s: ConnectionStatus) => void, 
    onMessage: (msg: PeerMessage) => void
  ) {
    onStatusChange('CONNECTING');
    try {
      this.rtcPeerConnection = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      this.dataChannel = this.rtcPeerConnection.createDataChannel('nebula_transfer');
      this.setupDataChannel(onMessage);

      // 模拟信令交换和 ICE 协商
      setTimeout(() => {
        onStatusChange('CONNECTED');
        console.log(`Connected to device: ${deviceId}`);
      }, 1000);
    } catch (err) {
      console.error('WiFi P2P Error:', err);
      onStatusChange('DISCONNECTED');
    }
  }

  public async startBluetooth(onStatusChange: (s: ConnectionStatus) => void) {
    const nav = navigator as any;
    if (!nav.bluetooth) {
      alert('您的浏览器不支持 Web Bluetooth API');
      return;
    }

    try {
      onStatusChange('CONNECTING');
      this.bluetoothDevice = await nav.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service']
      });

      this.bluetoothDevice.addEventListener('gattserverdisconnected', () => onStatusChange('DISCONNECTED'));
      
      await this.bluetoothDevice.gatt?.connect();
      onStatusChange('CONNECTED');
    } catch (err) {
      console.error('Bluetooth Error:', err);
      onStatusChange('DISCONNECTED');
    }
  }

  private setupDataChannel(onMessage: (msg: PeerMessage) => void) {
    if (!this.dataChannel) return;
    this.dataChannel.onopen = () => console.log('DataChannel Open');
    this.dataChannel.onmessage = (event) => {
      try {
        const msg: PeerMessage = JSON.parse(event.data);
        onMessage(msg);
      } catch (e) {
        console.error("Failed to parse P2P message", e);
      }
    };
  }

  public async sendFile(file: File | Blob, fileName: string, type: 'AUDIO' | 'IMAGE') {
    if (this.dataChannel?.readyState !== 'open' && this.bluetoothDevice?.gatt?.connected === false) {
      throw new Error('No active connection');
    }

    const reader = new FileReader();
    return new Promise<void>((resolve, reject) => {
      reader.onload = () => {
        const payload = reader.result as ArrayBuffer;
        const msg: PeerMessage = {
          type: 'FILE_TRANSFER',
          fileType: type,
          fileName: fileName,
          payload: payload // 注意：实际传输中 JSON 不支持直接传 ArrayBuffer，这里做演示处理
        };
        
        // 模拟通过 DataChannel 发送（实际需转为 Base64 或使用二进制通道）
        if (this.dataChannel?.readyState === 'open') {
          // 这里简化为发送描述符，模拟传输过程
          console.log(`Sending ${type} file: ${fileName}`);
          setTimeout(resolve, 500); 
        } else {
          resolve();
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  public disconnect() {
    this.rtcPeerConnection?.close();
    this.dataChannel?.close();
    this.bluetoothDevice?.gatt?.disconnect();
    this.rtcPeerConnection = null;
    this.dataChannel = null;
    this.bluetoothDevice = null;
  }
}

export const connectionService = new ConnectionService();
