import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    Dimensions,
    ScrollView,
    TextInput,
    PanResponder,
    Animated,
} from "react-native";
import { Video } from "expo-av";
import * as ImagePicker from "expo-image-picker";
import { OverlayMetadata, OverlayType } from "../types";
import { uploadVideo, getJobStatus, downloadVideo } from "../services/api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIDEO_PREVIEW_WIDTH = SCREEN_WIDTH - 40;
const VIDEO_PREVIEW_HEIGHT = (VIDEO_PREVIEW_WIDTH * 9) / 16;

export default function VideoEditor() {
    const [videoUri, setVideoUri] = useState<string | null>(null);
    const [overlays, setOverlays] = useState<OverlayMetadata[]>([]);
    const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [jobId, setJobId] = useState<string | null>(null);
    const [processingStatus, setProcessingStatus] = useState<string>("");
    const [uploadProgress, setUploadProgress] = useState<number>(0);
    const videoRef = useRef<Video>(null);

    useEffect(() => {
        requestPermissions();
    }, []);

    useEffect(() => {
        if (jobId && isProcessing) {
            pollJobStatus();
        }
    }, [jobId, isProcessing]);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
            Alert.alert("Permission needed", "Please grant media library access");
        }
    };

    const pickVideo = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                setVideoUri(result.assets[0].uri);
                setOverlays([]);
                setSelectedOverlay(null);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick video");
        }
    };

    const addTextOverlay = () => {
        const newOverlay: OverlayMetadata = {
            id: Date.now().toString(),
            type: OverlayType.TEXT,
            content: "Sample Text",
            x: 0.5,
            y: 0.5,
            start_time: 0,
            end_time: 5,
            font_size: 24,
            color: "#FFFFFF",
        };
        setOverlays([...overlays, newOverlay]);
        setSelectedOverlay(newOverlay.id);
    };

    const addImageOverlay = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                const newOverlay: OverlayMetadata = {
                    id: Date.now().toString(),
                    type: OverlayType.IMAGE,
                    content: result.assets[0].uri,
                    x: 0.3,
                    y: 0.3,
                    start_time: 0,
                    end_time: 5,
                    width: 0.2,
                    height: 0.2,
                };
                setOverlays([...overlays, newOverlay]);
                setSelectedOverlay(newOverlay.id);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick image");
        }
    };

    const addVideoOverlay = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsEditing: false,
                quality: 1,
            });

            if (!result.canceled && result.assets[0]) {
                const newOverlay: OverlayMetadata = {
                    id: Date.now().toString(),
                    type: OverlayType.VIDEO,
                    content: result.assets[0].uri,
                    x: 0.3,
                    y: 0.3,
                    start_time: 0,
                    end_time: 5,
                    width: 0.2,
                    height: 0.2,
                };
                setOverlays([...overlays, newOverlay]);
                setSelectedOverlay(newOverlay.id);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to pick video overlay");
        }
    };

    const deleteOverlay = (id: string) => {
        setOverlays(overlays.filter((o) => o.id !== id));
        if (selectedOverlay === id) {
            setSelectedOverlay(null);
        }
    };

    const updateOverlay = (id: string, updates: Partial<OverlayMetadata>) => {
        setOverlays(
            overlays.map((o) => (o.id === id ? { ...o, ...updates } : o))
        );
    };

    const handleSubmit = async () => {
        if (!videoUri) {
            Alert.alert("Error", "Please select a video first");
            return;
        }

        if (overlays.length === 0) {
            Alert.alert("Error", "Please add at least one overlay");
            return;
        }

        try {
            setIsProcessing(true);
            setUploadProgress(0);
            setProcessingStatus("Uploading video...");
            const response = await uploadVideo(videoUri, overlays, (progress) => {
                setUploadProgress(progress);
                setProcessingStatus(`Uploading video... ${progress}%`);
            });
            setJobId(response.job_id);
            setUploadProgress(100);
            setProcessingStatus("Video uploaded. Processing...");
        } catch (error: any) {
            Alert.alert("Error", error.message || "Failed to upload video");
            setIsProcessing(false);
            setUploadProgress(0);
        }
    };

    const pollJobStatus = async () => {
        if (!jobId) return;

        const interval = setInterval(async () => {
            try {
                const status = await getJobStatus(jobId);
                setProcessingStatus(
                    `Processing... ${status.progress ? Math.round(status.progress) : 0}%`
                );

                if (status.status === "completed") {
                    clearInterval(interval);
                    setProcessingStatus("Downloading video...");
                    try {
                        const downloadedUri = await downloadVideo(jobId);
                        setProcessingStatus("Video ready!");
                        Alert.alert(
                            "Success",
                            "Video processed successfully!",
                            [
                                {
                                    text: "OK",
                                    onPress: () => {
                                        setIsProcessing(false);
                                        setProcessingStatus("");
                                    },
                                },
                            ]
                        );
                    } catch (error: any) {
                        Alert.alert("Error", error.message || "Failed to download video");
                        setIsProcessing(false);
                    }
                } else if (status.status === "failed") {
                    clearInterval(interval);
                    Alert.alert("Error", status.error || "Video processing failed");
                    setIsProcessing(false);
                }
            } catch (error: any) {
                clearInterval(interval);
                Alert.alert("Error", error.message || "Failed to check status");
                setIsProcessing(false);
            }
        }, 2000); // Poll every 2 seconds
    };

    return (
        <View style={styles.container}>
            <ScrollView style={styles.scrollView}>
                <View style={styles.content}>
                    <Text style={styles.title}>Video Editor</Text>

                    {/* Video Preview */}
                    <View style={styles.videoContainer}>
                        {videoUri ? (
                            <View style={styles.videoWrapper}>
                                <Video
                                    ref={videoRef}
                                    source={{ uri: videoUri }}
                                    style={styles.video}
                                    resizeMode="contain" as any
                                    isLooping
                                    shouldPlay
                                    useNativeControls={false}
                                />
                                {/* Overlay rendering */}
                                {overlays.map((overlay) => (
                                    <OverlayView
                                        key={overlay.id}
                                        overlay={overlay}
                                        isSelected={selectedOverlay === overlay.id}
                                        onSelect={() => setSelectedOverlay(overlay.id)}
                                        onUpdate={(updates) => updateOverlay(overlay.id, updates)}
                                        onDelete={() => deleteOverlay(overlay.id)}
                                        videoWidth={VIDEO_PREVIEW_WIDTH}
                                        videoHeight={VIDEO_PREVIEW_HEIGHT}
                                    />
                                ))}
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[styles.placeholder, { height: VIDEO_PREVIEW_HEIGHT }]}
                                onPress={pickVideo}
                            >
                                <Text style={styles.placeholderText}>
                                    Tap to select video
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Controls */}
                    <View style={styles.controls}>
                        <TouchableOpacity
                            style={styles.button}
                            onPress={pickVideo}
                            disabled={isProcessing}
                        >
                            <Text style={styles.buttonText}>Select Video</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={addTextOverlay}
                            disabled={!videoUri || isProcessing}
                        >
                            <Text style={styles.buttonText}>Add Text</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={addImageOverlay}
                            disabled={!videoUri || isProcessing}
                        >
                            <Text style={styles.buttonText}>Add Image</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.button}
                            onPress={addVideoOverlay}
                            disabled={!videoUri || isProcessing}
                        >
                            <Text style={styles.buttonText}>Add Video</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Overlay List */}
                    {overlays.length > 0 && (
                        <View style={styles.overlayList}>
                            <Text style={styles.sectionTitle}>Overlays</Text>
                            {overlays.map((overlay) => (
                                <OverlayItem
                                    key={overlay.id}
                                    overlay={overlay}
                                    isSelected={selectedOverlay === overlay.id}
                                    onSelect={() => setSelectedOverlay(overlay.id)}
                                    onUpdate={(updates) => updateOverlay(overlay.id, updates)}
                                    onDelete={() => deleteOverlay(overlay.id)}
                                />
                            ))}
                        </View>
                    )}

                    {/* Overlay Property Editor */}
                    {selectedOverlay && (
                        <OverlayPropertyEditor
                            overlay={overlays.find((o) => o.id === selectedOverlay)!}
                            onUpdate={(updates) => updateOverlay(selectedOverlay, updates)}
                            onClose={() => setSelectedOverlay(null)}
                        />
                    )}

                    {/* Submit Button */}
                    <TouchableOpacity
                        style={[
                            styles.submitButton,
                            (!videoUri || overlays.length === 0 || isProcessing) &&
                            styles.submitButtonDisabled,
                        ]}
                        onPress={handleSubmit}
                        disabled={!videoUri || overlays.length === 0 || isProcessing}
                    >
                        <Text style={styles.submitButtonText}>
                            {isProcessing
                                ? uploadProgress > 0 && uploadProgress < 100
                                    ? `Uploading... ${uploadProgress}%`
                                    : processingStatus
                                : "Submit for Processing"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

// Overlay View Component
function OverlayView({
    overlay,
    isSelected,
    onSelect,
    onUpdate,
    onDelete,
    videoWidth,
    videoHeight,
}: {
    overlay: OverlayMetadata;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (updates: Partial<OverlayMetadata>) => void;
    onDelete: () => void;
    videoWidth: number;
    videoHeight: number;
}) {
    const pan = useRef(new Animated.ValueXY({
        x: overlay.x * videoWidth,
        y: overlay.y * videoHeight,
    })).current;

    const startX = useRef(overlay.x * videoWidth);
    const startY = useRef(overlay.y * videoHeight);

    // Update position when overlay changes
    useEffect(() => {
        const newX = overlay.x * videoWidth;
        const newY = overlay.y * videoHeight;
        pan.setValue({ x: newX, y: newY });
        startX.current = newX;
        startY.current = newY;
    }, [overlay.x, overlay.y, videoWidth, videoHeight]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                startX.current = overlay.x * videoWidth;
                startY.current = overlay.y * videoHeight;
                onSelect();
            },
            onPanResponderMove: (evt, gestureState) => {
                const newX = Math.max(
                    0,
                    Math.min(videoWidth - 50, startX.current + gestureState.dx)
                );
                const newY = Math.max(
                    0,
                    Math.min(videoHeight - 50, startY.current + gestureState.dy)
                );
                pan.setValue({
                    x: newX,
                    y: newY,
                });
            },
            onPanResponderRelease: (evt, gestureState) => {
                const finalX = Math.max(
                    0,
                    Math.min(videoWidth - 50, startX.current + gestureState.dx)
                );
                const finalY = Math.max(
                    0,
                    Math.min(videoHeight - 50, startY.current + gestureState.dy)
                );
                onUpdate({
                    x: finalX / videoWidth,
                    y: finalY / videoHeight,
                });
            },
        })
    ).current;

    const width = overlay.width ? overlay.width * videoWidth : 100;
    const height = overlay.height ? overlay.height * videoHeight : 50;

    return (
        <Animated.View
            {...panResponder.panHandlers}
            style={[
                styles.overlayView,
                {
                    width,
                    height,
                    left: pan.x,
                    top: pan.y,
                },
                isSelected && styles.overlaySelected,
            ]}
        >
            {overlay.type === OverlayType.TEXT && (
                <Text
                    style={[
                        styles.overlayText,
                        {
                            fontSize: overlay.font_size || 24,
                            color: overlay.color || "#FFFFFF",
                        },
                    ]}
                >
                    {overlay.content}
                </Text>
            )}
            {overlay.type === OverlayType.IMAGE && (
                <View style={styles.overlayImagePlaceholder}>
                    <Text style={styles.overlayImageText}>IMG</Text>
                </View>
            )}
            {overlay.type === OverlayType.VIDEO && (
                <View style={styles.overlayVideoPlaceholder}>
                    <Text style={styles.overlayVideoText}>VID</Text>
                </View>
            )}
        </Animated.View>
    );
}

// Overlay Item Component for List
function OverlayItem({
    overlay,
    isSelected,
    onSelect,
    onUpdate,
    onDelete,
}: {
    overlay: OverlayMetadata;
    isSelected: boolean;
    onSelect: () => void;
    onUpdate: (updates: Partial<OverlayMetadata>) => void;
    onDelete: () => void;
}) {
    return (
        <TouchableOpacity
            style={[styles.overlayItem, isSelected && styles.overlayItemSelected]}
            onPress={onSelect}
        >
            <View style={styles.overlayItemContent}>
                <Text style={styles.overlayItemType}>{overlay.type.toUpperCase()}</Text>
                <Text style={styles.overlayItemTime}>
                    {overlay.start_time}s - {overlay.end_time}s
                </Text>
            </View>
            <TouchableOpacity onPress={onDelete} style={styles.deleteButton}>
                <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
        </TouchableOpacity>
    );
}

// Overlay Property Editor Component
function OverlayPropertyEditor({
    overlay,
    onUpdate,
    onClose,
}: {
    overlay: OverlayMetadata;
    onUpdate: (updates: Partial<OverlayMetadata>) => void;
    onClose: () => void;
}) {
    const [startTime, setStartTime] = useState(overlay.start_time.toString());
    const [endTime, setEndTime] = useState(overlay.end_time.toString());
    const [content, setContent] = useState(overlay.content);
    const [fontSize, setFontSize] = useState(
        overlay.font_size?.toString() || "24"
    );
    const [color, setColor] = useState(overlay.color || "#FFFFFF");

    const applyChanges = () => {
        const updates: Partial<OverlayMetadata> = {
            start_time: parseFloat(startTime) || 0,
            end_time: parseFloat(endTime) || 0,
            content: content,
        };

        if (overlay.type === "text") {
            updates.font_size = parseInt(fontSize) || 24;
            updates.color = color;
        }

        onUpdate(updates);
    };

    useEffect(() => {
        applyChanges();
    }, [startTime, endTime, content, fontSize, color]);

    return (
        <View style={styles.propertyEditor}>
            <View style={styles.propertyEditorHeader}>
                <Text style={styles.propertyEditorTitle}>
                    Edit {overlay.type.toUpperCase()} Overlay
                </Text>
                <TouchableOpacity onPress={onClose}>
                    <Text style={styles.closeButton}>✕</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.propertyRow}>
                <Text style={styles.propertyLabel}>Start Time (s):</Text>
                <TextInput
                    style={styles.propertyInput}
                    value={startTime}
                    onChangeText={setStartTime}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.propertyRow}>
                <Text style={styles.propertyLabel}>End Time (s):</Text>
                <TextInput
                    style={styles.propertyInput}
                    value={endTime}
                    onChangeText={setEndTime}
                    keyboardType="numeric"
                />
            </View>

            {overlay.type === "text" && (
                <>
                    <View style={styles.propertyRow}>
                        <Text style={styles.propertyLabel}>Text Content:</Text>
                        <TextInput
                            style={styles.propertyInput}
                            value={content}
                            onChangeText={(text) => {
                                setContent(text);
                                onUpdate({ content: text });
                            }}
                        />
                    </View>

                    <View style={styles.propertyRow}>
                        <Text style={styles.propertyLabel}>Font Size:</Text>
                        <TextInput
                            style={styles.propertyInput}
                            value={fontSize}
                            onChangeText={setFontSize}
                            keyboardType="numeric"
                        />
                    </View>

                    <View style={styles.propertyRow}>
                        <Text style={styles.propertyLabel}>Color (hex):</Text>
                        <TextInput
                            style={styles.propertyInput}
                            value={color}
                            onChangeText={setColor}
                            placeholder="#FFFFFF"
                        />
                    </View>
                </>
            )}

            {(overlay.type === "image" || overlay.type === "video") && (
                <View style={styles.propertyRow}>
                    <Text style={styles.propertyLabel}>Content:</Text>
                    <Text style={styles.propertyValue} numberOfLines={1}>
                        {overlay.content}
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f5f5f5",
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 20,
        textAlign: "center",
    },
    videoContainer: {
        marginBottom: 20,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: "#000",
    },
    videoWrapper: {
        width: VIDEO_PREVIEW_WIDTH,
        height: VIDEO_PREVIEW_HEIGHT,
        position: "relative",
    },
    video: {
        width: VIDEO_PREVIEW_WIDTH,
        height: VIDEO_PREVIEW_HEIGHT,
    },
    placeholder: {
        width: VIDEO_PREVIEW_WIDTH,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#333",
        borderRadius: 10,
    },
    placeholderText: {
        color: "#fff",
        fontSize: 16,
    },
    controls: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginBottom: 20,
    },
    button: {
        backgroundColor: "#007AFF",
        padding: 12,
        borderRadius: 8,
        marginBottom: 10,
        minWidth: "48%",
    },
    buttonText: {
        color: "#fff",
        textAlign: "center",
        fontWeight: "600",
    },
    overlayList: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 10,
    },
    overlayItem: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: "#fff",
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    overlayItemSelected: {
        backgroundColor: "#e3f2fd",
        borderWidth: 2,
        borderColor: "#007AFF",
    },
    overlayItemContent: {
        flex: 1,
    },
    overlayItemType: {
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 4,
    },
    overlayItemTime: {
        fontSize: 12,
        color: "#666",
    },
    deleteButton: {
        backgroundColor: "#ff3b30",
        padding: 8,
        borderRadius: 6,
    },
    deleteButtonText: {
        color: "#fff",
        fontSize: 12,
    },
    submitButton: {
        backgroundColor: "#34C759",
        padding: 16,
        borderRadius: 10,
        marginTop: 20,
    },
    submitButtonDisabled: {
        backgroundColor: "#ccc",
    },
    submitButtonText: {
        color: "#fff",
        textAlign: "center",
        fontSize: 16,
        fontWeight: "600",
    },
    overlayView: {
        position: "absolute",
        backgroundColor: "rgba(0, 122, 255, 0.3)",
        borderWidth: 2,
        borderColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
    },
    overlaySelected: {
        borderColor: "#FF9500",
        backgroundColor: "rgba(255, 149, 0, 0.3)",
    },
    overlayText: {
        color: "#FFFFFF",
    },
    overlayImagePlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 255, 255, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    overlayImageText: {
        color: "#000",
        fontSize: 12,
    },
    overlayVideoPlaceholder: {
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(255, 0, 0, 0.5)",
        justifyContent: "center",
        alignItems: "center",
    },
    overlayVideoText: {
        color: "#fff",
        fontSize: 12,
    },
    propertyEditor: {
        backgroundColor: "#fff",
        padding: 16,
        borderRadius: 10,
        marginTop: 20,
        marginBottom: 20,
    },
    propertyEditorHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
    },
    propertyEditorTitle: {
        fontSize: 18,
        fontWeight: "600",
    },
    closeButton: {
        fontSize: 24,
        color: "#666",
    },
    propertyRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 12,
    },
    propertyLabel: {
        width: 120,
        fontSize: 14,
        fontWeight: "500",
    },
    propertyInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        padding: 8,
        fontSize: 14,
    },
    propertyValue: {
        flex: 1,
        fontSize: 14,
        color: "#666",
    },
});

