import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;

  startConnection(): Promise<void> {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.hubUrl}?apiKey=${encodeURIComponent(environment.apiKey)}`, {
        withCredentials: true
      })
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    return this.hubConnection
      .start()
      .then(() => console.log('Conexión establecida con SignalR'))
      .catch((error) => {
        console.error('Error al conectar con SignalR:', error);
        throw error;
      });
  }

  subscribeMessage<T>(eventName: string, handler: (data: T) => void): void {
    if (this.hubConnection) {
      this.hubConnection.on(eventName, handler);
      return;
    }

    console.error('Conexión SignalR no establecida.');
  }

  unsubscribeMessage(eventName: string): void {
    this.hubConnection?.off(eventName);
  }

  stopConnection(): void {
    this.hubConnection?.stop();
  }
}
