package com.restaurant.platform.util;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.IOException;

public class EnvLoader {
    public static void loadEnv() {
        // Look in current directory and parent directory for .env
        File envFile = new File(".env");
        if (!envFile.exists()) {
            envFile = new File("../.env");
        }
        
        if (envFile.exists()) {
            System.out.println("Loading environment variables from: " + envFile.getAbsolutePath());
            try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    line = line.trim();
                    if (line.isEmpty() || line.startsWith("#")) {
                        continue;
                    }
                    int eqIndex = line.indexOf('=');
                    if (eqIndex > 0) {
                        String key = line.substring(0, eqIndex).trim();
                        String value = line.substring(eqIndex + 1).trim();
                        // Strip quotes if present
                        if (value.startsWith("\"") && value.endsWith("\"")) {
                            value = value.substring(1, value.length() - 1);
                        } else if (value.startsWith("'") && value.endsWith("'")) {
                            value = value.substring(1, value.length() - 1);
                        }
                        
                        // If it is the SMTP password, strip spaces (Gmail app passwords have spaces for presentation)
                        if ("SMTP_PASSWORD".equalsIgnoreCase(key)) {
                            value = value.replace(" ", "");
                        }
                        
                        System.setProperty(key, value);
                    }
                }
            } catch (IOException e) {
                System.err.println("Error reading .env file: " + e.getMessage());
            }
        } else {
            System.out.println(".env file not found. Relying on system environment variables.");
        }
    }
}
