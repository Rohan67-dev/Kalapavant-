package com.restaurant.platform.service;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
public class WebSocketService {

    private final SimpMessagingTemplate messagingTemplate;

    public WebSocketService(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    public void sendUpdate(String type, Object payload) {
        SystemMessage message = new SystemMessage(type, payload);
        messagingTemplate.convertAndSend("/topic/restaurant", message);
    }

    @Data
    @AllArgsConstructor
    public static class SystemMessage {
        private String type;
        private Object payload;
    }
}
