import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { sendChatMessage, confirmAction, ChatResponse } from '../../services/chatApi';

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
}

interface PendingAction {
    kind: string;
    orderId?: string;
    requestId?: string;
    summary?: string;
}

export default function ChatScreen() {
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            text: "👋 Hi! I'm Merve, your local assistant. I can help you order food, book services, find places, and more. What would you like to do?",
            sender: 'bot',
            timestamp: new Date(),
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [sessionId, setSessionId] = useState<string | undefined>();
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const flatListRef = useRef<FlatList>(null);

    const scrollToBottom = () => {
        setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
    };

    const addMessage = (text: string, sender: 'user' | 'bot') => {
        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            sender,
            timestamp: new Date(),
        };
        setMessages((prev) => [...prev, newMessage]);
        return newMessage;
    };

    const handleSend = async () => {
        if (!inputText.trim() || isLoading) return;

        const userText = inputText.trim();
        setInputText('');
        addMessage(userText, 'user');
        setIsLoading(true);
        scrollToBottom();

        try {
            const response: ChatResponse = await sendChatMessage(userText, sessionId);

            // Update session ID
            if (response.sessionId) {
                setSessionId(response.sessionId);
            }

            // Add bot response
            addMessage(response.text, 'bot');

            // Check for pending action requiring confirmation
            if (response.awaitingConfirmation && response.pendingAction) {
                setPendingAction(response.pendingAction);
            } else {
                setPendingAction(null);
            }

            // Check for completed booking
            if (response.booking?.confirmationCode) {
                addMessage(
                    `🎉 Booking confirmed! Your confirmation code is: ${response.booking.confirmationCode}`,
                    'bot'
                );
            }
        } catch (error) {
            console.error('Error sending message:', error);
            addMessage(
                '❌ Sorry, I had trouble connecting. Please check your internet and try again.',
                'bot'
            );
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    const handleConfirm = async (confirmed: boolean) => {
        if (!sessionId) return;

        addMessage(confirmed ? '✅ Yes' : '❌ No', 'user');
        setIsLoading(true);
        setPendingAction(null);
        scrollToBottom();

        try {
            const response = await confirmAction(sessionId, confirmed);

            if (response.sessionId) {
                setSessionId(response.sessionId);
            }

            addMessage(response.text, 'bot');

            if (response.awaitingConfirmation && response.pendingAction) {
                setPendingAction(response.pendingAction);
            }
        } catch (error) {
            console.error('Error confirming:', error);
            addMessage('❌ Error processing confirmation. Please try again.', 'bot');
        } finally {
            setIsLoading(false);
            scrollToBottom();
        }
    };

    const renderMessage = ({ item }: { item: Message }) => (
        <View
            style={[
                styles.messageBubble,
                item.sender === 'user' ? styles.userBubble : styles.botBubble,
            ]}
        >
            <Text
                style={[
                    styles.messageText,
                    item.sender === 'user' ? styles.userText : styles.botText,
                ]}
            >
                {item.text}
            </Text>
            <Text style={styles.timestamp}>
                {item.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                })}
            </Text>
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>💬 Chat with Merve</Text>
                <Text style={styles.headerSubtitle}>Your AI assistant</Text>
            </View>

            {/* Messages */}
            <FlatList
                ref={flatListRef}
                data={messages}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={renderMessage}
                onContentSizeChange={scrollToBottom}
            />

            {/* Confirmation Buttons */}
            {pendingAction && (
                <View style={styles.confirmationContainer}>
                    <Text style={styles.confirmationText}>
                        {pendingAction.summary || 'Confirm this action?'}
                    </Text>
                    <View style={styles.confirmationButtons}>
                        <TouchableOpacity
                            style={[styles.confirmButton, styles.yesButton]}
                            onPress={() => handleConfirm(true)}
                            disabled={isLoading}
                        >
                            <Text style={styles.confirmButtonText}>✓ Yes, confirm</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.confirmButton, styles.noButton]}
                            onPress={() => handleConfirm(false)}
                            disabled={isLoading}
                        >
                            <Text style={styles.confirmButtonText}>✗ Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Loading Indicator */}
            {isLoading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#6C5CE7" size="small" />
                    <Text style={styles.loadingText}>Merve is thinking...</Text>
                </View>
            )}

            {/* Input */}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.input}
                    placeholder="Ask Merve anything..."
                    placeholderTextColor="#999"
                    value={inputText}
                    onChangeText={setInputText}
                    onSubmitEditing={handleSend}
                    editable={!isLoading}
                    multiline
                    maxLength={500}
                />
                <TouchableOpacity
                    onPress={handleSend}
                    style={[styles.sendButton, isLoading && styles.sendButtonDisabled]}
                    disabled={isLoading || !inputText.trim()}
                >
                    <Text style={styles.sendButtonText}>
                        {isLoading ? '...' : '➤'}
                    </Text>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        backgroundColor: '#6C5CE7',
        paddingTop: 50,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4,
    },
    listContent: {
        padding: 16,
        paddingBottom: 8,
    },
    messageBubble: {
        maxWidth: '85%',
        padding: 14,
        borderRadius: 18,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#6C5CE7',
        borderBottomRightRadius: 4,
    },
    botBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userText: {
        color: '#fff',
    },
    botText: {
        color: '#333',
    },
    timestamp: {
        fontSize: 11,
        color: 'rgba(0,0,0,0.4)',
        marginTop: 6,
        alignSelf: 'flex-end',
    },
    confirmationContainer: {
        backgroundColor: '#fff',
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    confirmationText: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
        color: '#333',
    },
    confirmationButtons: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
    },
    confirmButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        minWidth: 120,
    },
    yesButton: {
        backgroundColor: '#00B894',
    },
    noButton: {
        backgroundColor: '#FF6B6B',
    },
    confirmButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
        fontSize: 14,
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        gap: 8,
    },
    loadingText: {
        fontSize: 14,
        color: '#6C5CE7',
        fontStyle: 'italic',
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 12,
        paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#E9ECEF',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        minHeight: 44,
        maxHeight: 100,
        borderWidth: 1,
        borderColor: '#E9ECEF',
        borderRadius: 22,
        paddingHorizontal: 18,
        paddingVertical: 10,
        marginRight: 10,
        fontSize: 16,
        backgroundColor: '#F8F9FA',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#6C5CE7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#CCC',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
});
