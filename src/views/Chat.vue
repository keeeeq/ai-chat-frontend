<template>
  <div class="chat-app">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <el-tooltip content="点击返回首页" placement="bottom">
          <h1 class="app-title" @click="goToHome">AI 助手</h1>
        </el-tooltip>
        <el-button type="primary" class="new-chat-btn" @click="createNewChat">
          <el-icon><Plus /></el-icon>
          新对话
        </el-button>
      </div>

      <div class="chat-list">
        <div
          v-for="chat in chatList"
          :key="chat.id"
          :class="['chat-item', { active: currentChatId === chat.id }]"
          @click="switchChat(chat.id)"
        >
          <div class="chat-item-icon">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="chat-item-info">
            <div class="chat-item-title">{{ chat.title || "新对话" }}</div>
            <div class="chat-item-actions">
              <el-button
                type="text"
                @click.stop="showRenameDialog(chat)"
                class="action-btn"
              >
                <el-icon><Edit /></el-icon>
              </el-button>
              <el-button
                type="text"
                @click.stop="deleteChat(chat.id)"
                class="action-btn"
              >
                <el-icon><Delete /></el-icon>
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="main-content">
      <div class="chat-container">
        <!-- 聊天消息列表 -->
        <div class="messages-container" ref="messagesContainer">
          <div
            v-for="(message, index) in currentChatHistory"
            :key="index"
            :class="[
              'message',
              message.type === 'user' ? 'message-user' : 'message-ai',
            ]"
          >
            <div class="message-avatar">
              <el-avatar :size="36">
                <el-icon v-if="message.type === 'user'"><User /></el-icon>
                <el-icon v-else><ChatDotRound /></el-icon>
              </el-avatar>
            </div>
            <div class="message-bubble">
              <div
                class="message-content"
                v-html="renderMessageContent(message)"
              ></div>
              <div class="message-meta">
                <span class="message-time">{{
                  formatTime(message.timestamp)
                }}</span>
              </div>
            </div>
          </div>

          <!-- 加载状态 -->
          <div v-if="loading" class="message message-ai">
            <div class="message-avatar">
              <el-avatar :size="36">
                <el-icon><ChatDotRound /></el-icon>
              </el-avatar>
            </div>
            <div class="message-bubble loading">
              <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        </div>

        <!-- 输入区域 -->
        <div class="input-container">
          <div class="input-toolbar">
            <el-upload
              class="upload-area"
              :action="null"
              :auto-upload="false"
              :on-change="handleFileChange"
              :on-remove="handleFileRemove"
              :limit="5"
              multiple
              accept="image/*,audio/*"
              :file-list="fileList"
              :http-request="() => {}"
              :before-upload="() => true"
            >
              <el-button class="upload-btn">
                <el-icon><Upload /></el-icon>
              </el-button>
            </el-upload>
          </div>

          <div class="input-wrapper">
            <el-input
              v-model="userInput"
              type="textarea"
              :rows="3"
              placeholder="输入消息..."
              @keyup.enter.ctrl="sendMessage"
              resize="none"
            />
            <el-button
              type="primary"
              class="send-btn"
              :disabled="!userInput.trim() && fileList.length === 0"
              @click="sendMessage"
            >
              <el-icon><Position /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 重命名对话框 -->
    <el-dialog
      v-model="renameDialogVisible"
      title="重命名对话"
      width="400px"
      :close-on-click-modal="false"
      class="rename-dialog"
    >
      <el-input v-model="renameInput" placeholder="请输入新的对话名称" />
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="renameDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmRename">确定</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick, computed } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import { marked } from "marked";
import {
  User,
  ChatDotRound,
  Position,
  Plus,
  Edit,
  Delete,
  Upload,
} from "@element-plus/icons-vue";
import dayjs from "dayjs";

const userInput = ref("");
const loading = ref(false);
const messagesContainer = ref(null);
const currentChatId = ref("");
const chatList = ref([]);
const allChatHistory = ref({});
const renameDialogVisible = ref(false);
const renameInput = ref("");
const currentRenameChat = ref(null);
const router = useRouter();
const CHAT_TYPE = "chat"; // 定义聊天类型常量

const currentChatHistory = computed(() => {
  return allChatHistory.value[currentChatId.value] || [];
});

const generateChatId = () => {
  return Date.now().toString();
};

const createNewChat = () => {
  const newChatId = generateChatId();
  chatList.value.unshift({
    id: newChatId,
    title: "新对话",
    timestamp: new Date(),
  });
  allChatHistory.value[newChatId] = [];
  currentChatId.value = newChatId;
};

const switchChat = async (chatId) => {
  currentChatId.value = chatId;
  // 从后端获取历史消息
  try {
    console.log("正在获取历史消息，chatId:", chatId);
    const response = await axios.get(`/ai/history/${CHAT_TYPE}/${chatId}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    console.log("获取到的历史消息:", response.data);

    if (response.data && Array.isArray(response.data)) {
      allChatHistory.value[chatId] = response.data.map((msg) => ({
        type: msg.role === "assistant" ? "ai" : "user",
        content: msg.content || "",
        timestamp: new Date(),
      }));
      scrollToBottom();
    } else {
      console.warn("历史消息数据格式不正确:", response.data);
      allChatHistory.value[chatId] = [];
    }
  } catch (error) {
    console.error("获取历史消息失败:", error.response || error);
    ElMessage.error(
      `获取历史消息失败: ${error.response?.data?.message || error.message}`
    );
    allChatHistory.value[chatId] = [];
  }
};

const showRenameDialog = (chat) => {
  currentRenameChat.value = chat;
  renameInput.value = chat.title;
  renameDialogVisible.value = true;
};

const confirmRename = () => {
  if (!renameInput.value.trim()) {
    ElMessage.warning("请输入对话名称");
    return;
  }
  currentRenameChat.value.title = renameInput.value.trim();
  renameDialogVisible.value = false;
};

const deleteChat = async (chatId) => {
  try {
    await ElMessageBox.confirm("确定要删除这个对话吗？", "提示", {
      confirmButtonText: "确定",
      cancelButtonText: "取消",
      type: "warning",
    });

    const index = chatList.value.findIndex((chat) => chat.id === chatId);
    if (index !== -1) {
      chatList.value.splice(index, 1);
      delete allChatHistory.value[chatId];

      if (currentChatId.value === chatId) {
        if (chatList.value.length > 0) {
          currentChatId.value = chatList.value[0].id;
        } else {
          createNewChat();
        }
      }
    }

    ElMessage.success("对话已删除");
  } catch {
    // 用户取消删除
  }
};

const formatTime = (timestamp) => {
  return dayjs(timestamp).format("HH:mm");
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

// 文件上传相关
const fileList = ref([]);

// 将图片转换为JPG格式
const convertToJpg = (file) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file); // 如果不是图片，直接返回原文件
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);

        canvas.toBlob(
          (blob) => {
            const jpgFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              {
                type: "image/jpeg",
                lastModified: new Date().getTime(),
              }
            );
            resolve(jpgFile);
          },
          "image/jpeg",
          0.9
        );
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const handleFileChange = async (file, uploadFiles) => {
  console.log("文件变更:", file, uploadFiles);

  // 验证文件类型
  const isImage = file.raw.type.startsWith("image/");
  const isAudio = file.raw.type.startsWith("audio/");

  if (!isImage && !isAudio) {
    ElMessage.error("只能上传图片或音频文件！");
    return false;
  }

  // 验证文件大小（10MB）
  const isLt10M = file.raw.size / 1024 / 1024 < 10;
  if (!isLt10M) {
    ElMessage.error("文件大小不能超过10MB！");
    return false;
  }

  // 如果是图片，转换为JPG
  if (isImage) {
    try {
      const jpgFile = await convertToJpg(file.raw);
      file.raw = jpgFile;
      file.name = jpgFile.name;
      file.type = "image/jpeg";
    } catch (error) {
      console.error("图片转换失败:", error);
      ElMessage.error("图片转换失败，请重试");
      return false;
    }
  }

  // 更新fileList
  fileList.value = [...uploadFiles];
  console.log("更新后的fileList:", fileList.value);

  return true;
};

const handleFileRemove = (file, uploadFiles) => {
  console.log("移除文件:", file, uploadFiles);
  fileList.value = [...uploadFiles];
};

// 修改发送消息函数
const sendMessage = async () => {
  if (!userInput.value.trim() && fileList.value.length === 0) {
    ElMessage.warning("请输入内容或上传文件");
    return;
  }

  if (!currentChatId.value) {
    createNewChat();
  }

  const userMessage = userInput.value.trim();
  const timestamp = new Date();

  console.log("准备发送的文件列表:", fileList.value);

  // 添加用户消息到历史记录
  allChatHistory.value[currentChatId.value].push({
    type: "user",
    content: userMessage,
    files: fileList.value.map((file) => ({
      name: file.name,
      url: URL.createObjectURL(file.raw),
      type: file.raw.type,
    })),
    timestamp,
  });

  loading.value = true;
  try {
    // 创建FormData对象
    const formData = new FormData();
    formData.append("prompt", userMessage);
    formData.append("chatId", currentChatId.value);
    formData.append("type", CHAT_TYPE);

    // 添加文件
    const files = fileList.value;
    console.log("实际文件列表:", files);

    // 确保每个文件都是有效的File对象
    for (const file of files) {
      if (file.raw instanceof File) {
        // 创建新的File对象，确保类型正确
        const newFile = new File([file.raw], file.name, {
          type: file.raw.type,
          lastModified: file.raw.lastModified,
        });

        // 确保文件名和类型正确
        if (file.raw.type.startsWith("image/")) {
          formData.append("files", newFile, `${Date.now()}_${file.name}`);
        } else if (file.raw.type.startsWith("audio/")) {
          formData.append("files", newFile, `${Date.now()}_${file.name}`);
        }

        console.log(
          "添加文件到FormData:",
          newFile.name,
          newFile.type,
          newFile.size
        );
      } else {
        console.warn("无效的文件对象:", file);
      }
    }

    console.log("FormData中的文件数量:", formData.getAll("files").length);
    console.log("FormData内容:", Object.fromEntries(formData.entries()));

    const response = await axios.post("/ai/chat", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        Accept: "text/html;charset=utf-8",
      },
      responseType: "text",
      transformRequest: [(data) => data],
    });

    allChatHistory.value[currentChatId.value].push({
      type: "ai",
      content: response.data,
      timestamp: new Date(),
    });

    // 更新对话标题
    if (
      chatList.value.find((chat) => chat.id === currentChatId.value).title ===
      "新对话"
    ) {
      const firstMessage =
        userMessage.slice(0, 20) + (userMessage.length > 20 ? "..." : "");
      chatList.value.find((chat) => chat.id === currentChatId.value).title =
        firstMessage;
    }

    ElMessage.success("消息发送成功");
  } catch (error) {
    if (error.code === "ERR_NETWORK") {
      ElMessage.error(
        "无法连接到AI服务，请确保后端服务已启动（http://127.0.0.1:8082）"
      );
    } else {
      ElMessage.error(`发送消息失败: ${error.message}`);
    }
    console.error("Error:", error);
  } finally {
    loading.value = false;
    userInput.value = "";
    fileList.value = [];
    scrollToBottom();
  }
};

const goToHome = () => {
  router.push("/");
};

const parseMarkdown = (text) => {
  if (text) {
    return marked(text);
  }
  return "";
};

// 修改消息显示组件
const renderMessageContent = (message) => {
  let content = "";

  // 添加文本内容
  if (message.content) {
    content += `<div class="message-text-inner">${message.content}</div>`;
  }

  // 添加文件预览
  if (message.files && message.files.length > 0) {
    content += '<div class="message-files-container">';
    content += message.files
      .map((file) => {
        if (file.type.startsWith("image/")) {
          return `<div class="message-image-row"><img src="${file.url}" alt="${file.name}" class="thumbnail" /></div>`;
        } else if (file.type.startsWith("audio/")) {
          return `<div class="message-audio"><audio controls src="${file.url}"></audio></div>`;
        }
        return "";
      })
      .join("");
    content += "</div>";
  }

  return content;
};

onMounted(async () => {
  // 获取所有历史会话
  try {
    console.log("正在获取会话列表");
    const response = await axios.get(`/ai/history/${CHAT_TYPE}`, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    });
    console.log("获取到的会话列表:", response.data);

    if (
      response.data &&
      Array.isArray(response.data) &&
      response.data.length > 0
    ) {
      chatList.value = response.data.map((chatId) => ({
        id: chatId,
        title: "历史对话",
        timestamp: new Date(),
      }));
      currentChatId.value = chatList.value[0].id;
      // 获取第一个会话的历史消息
      await switchChat(currentChatId.value);
    } else {
      console.log("没有历史会话，创建新会话");
      createNewChat();
    }
  } catch (error) {
    console.error("获取历史会话失败:", error.response || error);
    ElMessage.error(
      `获取历史会话失败: ${error.response?.data?.message || error.message}`
    );
    createNewChat();
  }

  // 监听图片点击事件
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("thumbnail")) {
      const img = e.target;
      // 创建一个新的图片对象来获取原始尺寸
      const originalImg = new Image();
      originalImg.onload = () => {
        const maxWidth = Math.min(originalImg.width, window.innerWidth * 0.9);
        const maxHeight = Math.min(
          originalImg.height,
          window.innerHeight * 0.8
        );

        ElMessageBox.alert(
          `<img src="${img.src}" class="preview-image" style="max-width: ${maxWidth}px; max-height: ${maxHeight}px; width: auto; height: auto;" />`,
          "图片预览",
          {
            dangerouslyUseHTMLString: true,
            customClass: "image-preview-dialog",
            showClose: true,
            closeOnClickModal: true,
            closeOnPressEscape: true,
          }
        );
      };
      originalImg.src = img.src;
    }
  });
});
</script>

<style scoped>
.chat-app {
  display: flex;
  height: 100vh;
  background-color: #f7f7f7;
}

/* 侧边栏样式 */
.sidebar {
  width: 280px;
  background: #ffffff;
  border-right: 1px solid #e8e8e8;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e8e8e8;
}

.app-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  margin: 0 0 16px;
}

.new-chat-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 40px;
  border-radius: 8px;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-bottom: 4px;
}

.chat-item:hover {
  background-color: #f5f5f5;
}

.chat-item.active {
  background-color: #e6f4ff;
}

.chat-item-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.chat-item.active .chat-item-icon {
  background: #1890ff;
  color: white;
}

.chat-item-info {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.chat-item-title {
  font-size: 14px;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-item-actions {
  display: none;
  gap: 4px;
}

.chat-item:hover .chat-item-actions {
  display: flex;
}

.action-btn {
  padding: 4px;
  color: #999;
}

.action-btn:hover {
  color: #1890ff;
}

/* 主内容区域样式 */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 消息样式 */
.message {
  display: flex;
  gap: 12px;
  max-width: 85%;
}

.message-user {
  flex-direction: row-reverse;
  align-self: flex-end;
}

.message-ai {
  align-self: flex-start;
}

.message-avatar {
  flex-shrink: 0;
}

.message-bubble {
  background: #fff;
  border-radius: 16px;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  position: relative;
}

.message-user .message-bubble {
  background: #1890ff;
  color: white;
}

.message-content {
  font-size: 15px;
  line-height: 1.6;
  max-width: 100%;
}

.message-meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.message-user .message-meta {
  color: rgba(255, 255, 255, 0.8);
}

/* 文件预览样式 */
.message-files-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  max-width: 100%;
}

:deep(.message-image-row) {
  width: 120px !important;
  height: 90px !important;
  max-width: 120px !important;
  max-height: 90px !important;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.message-image-row img.thumbnail) {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block;
}

/* 输入区域样式 */
.input-container {
  padding: 20px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
}

.input-toolbar {
  margin-bottom: 12px;
  display: flex;
  align-items: center;
}

.upload-btn {
  padding: 8px;
  border-radius: 8px;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

:deep(.el-textarea__inner) {
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 12px;
  resize: none;
  transition: all 0.3s ease;
  font-size: 15px;
  line-height: 1.6;
}

:deep(.el-textarea__inner:focus) {
  border-color: #1890ff;
  box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.1);
}

.send-btn {
  padding: 12px;
  border-radius: 12px;
  height: 48px;
  width: 48px;
}

/* 加载动画 */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
}

.typing-indicator span {
  width: 8px;
  height: 8px;
  background: #e0e0e0;
  border-radius: 50%;
  animation: typing 1s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* 重命名对话框样式 */
.rename-dialog :deep(.el-dialog) {
  border-radius: 16px;
}

.rename-dialog :deep(.el-dialog__header) {
  margin: 0;
  padding: 20px 20px 12px;
}

.rename-dialog :deep(.el-dialog__body) {
  padding: 0 20px 20px;
}

.rename-dialog :deep(.el-dialog__footer) {
  padding: 12px 20px 20px;
  margin-top: 0;
}
</style>
