<template>
  <div class="chat-app">
    <!-- 侧边栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <el-tooltip content="点击返回首页" placement="bottom">
          <h1 class="app-title" @click="goToHome">PDF知识库</h1>
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
      <!-- 文件管理区域 -->
      <div class="file-section">
        <h3>文件管理</h3>
        <el-upload
          v-if="currentChatId"
          class="upload-area"
          :action="`http://127.0.0.1:8082/ai/pdf/upload/${currentChatId}`"
          :on-success="handleUploadSuccess"
          :on-error="handleUploadError"
          :before-upload="beforeUpload"
          :on-progress="handleUploadProgress"
          :limit="1"
          accept=".pdf"
        >
          <el-button type="primary">
            <el-icon><Upload /></el-icon>上传PDF文件
          </el-button>
          <template #tip>
            <div class="el-upload__tip">只能上传PDF文件，且不超过10MB</div>
          </template>
        </el-upload>
        <div v-else class="upload-tip">请先选择或创建一个对话</div>
        <div class="file-list">
          <div v-for="file in fileList" :key="file.id" class="file-item">
            <el-icon><Document /></el-icon>
            <span class="file-name">{{ file.name }}</span>
            <div class="file-actions">
              <el-button
                type="primary"
                size="small"
                @click="downloadFile(file.id, file.name)"
              >
                下载
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="deleteFile(file.id)"
              >
                删除
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 主聊天区域 -->
    <div class="main-content">
      <div class="chat-container">
        <div class="messages-container" ref="messageList">
          <div
            v-for="msg in messages"
            :key="msg.id"
            :class="[
              'message',
              msg.role === 'user' ? 'message-user' : 'message-ai',
            ]"
          >
            <div class="message-avatar">
              <el-avatar :size="36">
                <el-icon v-if="msg.role === 'user'"><User /></el-icon>
                <el-icon v-else><ChatDotRound /></el-icon>
              </el-avatar>
            </div>
            <div class="message-bubble">
              <div
                class="message-content"
                v-html="renderMarkdown(msg.content)"
              ></div>
              <div class="message-meta">
                <span class="message-time">{{
                  formatTime(msg.timestamp)
                }}</span>
              </div>
            </div>
          </div>
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
          <div class="input-wrapper">
            <el-input
              v-model="userInput"
              type="textarea"
              :rows="3"
              placeholder="请输入您的问题..."
              @keyup.enter.ctrl="sendMessage"
              resize="none"
            />
            <el-button
              type="primary"
              class="send-btn"
              :loading="loading"
              :disabled="!userInput.trim()"
              @click="sendMessage"
            >
              <el-icon><ChatDotRound /></el-icon>
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
import { ref, onMounted, nextTick } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { marked } from "marked";
import {
  Plus,
  ChatDotRound,
  Delete,
  Upload,
  Document,
  Edit,
  User,
} from "@element-plus/icons-vue";
import dayjs from "dayjs";

const route = useRoute();
const router = useRouter();

// 状态变量
const chatList = ref([]);
const currentChatId = ref("");
const messages = ref([]);
const userInput = ref("");
const loading = ref(false);
const fileList = ref([]);
const messageList = ref(null);
const renameDialogVisible = ref(false);
const renameInput = ref("");
const currentRenameChat = ref(null);

// 格式化时间
const formatTime = (timestamp) => {
  return dayjs(timestamp).format("YYYY-MM-DD HH:mm:ss");
};

// 创建新对话
const createNewChat = () => {
  const chatId = Date.now().toString();
  chatList.value.unshift({
    id: chatId,
    title: "新对话",
    timestamp: new Date(),
  });
  currentChatId.value = chatId;
  router.push(`/ai/pdf/chat/${chatId}`);
  messages.value = [];
  fileList.value = [];
};

// 切换对话
const switchChat = (chatId) => {
  currentChatId.value = chatId;
  router.push(`/ai/pdf/chat/${chatId}`);
  loadChatHistory(chatId);
};

// 加载聊天历史
const loadChatHistory = async (chatId) => {
  try {
    console.log("开始加载聊天历史，chatId:", chatId);
    const response = await fetch(
      `http://127.0.0.1:8082/ai/history/pdf/${chatId}`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("获取到的聊天历史数据:", data);

    // 将后端返回的消息格式转换为前端使用的格式
    messages.value = data.map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: new Date(msg.timestamp || Date.now()),
    }));

    await nextTick();
    scrollToBottom();
  } catch (error) {
    console.error("加载聊天历史失败:", error);
    ElMessage.error("加载聊天历史失败");
    messages.value = [];
  }
};

// 发送消息
const sendMessage = async () => {
  if (!userInput.value.trim() || loading.value) return;

  const message = userInput.value;
  userInput.value = "";
  loading.value = true;

  // 如果是新对话，先创建对话
  if (messages.value.length === 0) {
    try {
      const createResponse = await fetch("http://127.0.0.1:8082/ai/pdf/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          prompt: message,
          chatId: currentChatId.value,
        }),
      });

      if (!createResponse.ok) {
        throw new Error("创建对话失败");
      }

      // 更新当前对话ID
      const oldChatId = currentChatId.value;
      currentChatId.value = currentChatId.value;

      // 更新聊天列表中的ID
      const chatIndex = chatList.value.findIndex(
        (chat) => chat.id === oldChatId
      );
      if (chatIndex !== -1) {
        chatList.value[chatIndex].id = currentChatId.value;
      }

      router.push(`/ai/pdf/chat/${currentChatId.value}`);
    } catch (error) {
      console.error("创建对话失败:", error);
      ElMessage.error("创建对话失败，请重试");
      loading.value = false;
      return;
    }
  }

  messages.value.push({
    role: "user",
    content: message,
    timestamp: new Date(),
  });

  try {
    const response = await fetch(
      `http://127.0.0.1:8082/ai/pdf/chat?prompt=${encodeURIComponent(
        message
      )}&chatId=${currentChatId.value}`,
      {
        method: "POST",
        headers: {
          Accept: "text/html;charset=utf-8",
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // 处理流式响应
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = {
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    messages.value.push(assistantMessage);

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const text = decoder.decode(value);
      assistantMessage.content += text;
      await nextTick();
      scrollToBottom();
    }
  } catch (error) {
    console.error("发送消息失败:", error);
    ElMessage.error("发送消息失败");
  } finally {
    loading.value = false;
  }
};

// 重命名对话
const showRenameDialog = (chat) => {
  currentRenameChat.value = chat;
  renameInput.value = chat.title || "";
  renameDialogVisible.value = true;
};

const confirmRename = async () => {
  if (!currentRenameChat.value) return;

  try {
    const response = await fetch(
      `http://127.0.0.1:8082/ai/pdf/chat/${currentRenameChat.value.id}/rename`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: renameInput.value }),
      }
    );

    if (!response.ok) {
      throw new Error("重命名失败");
    }

    currentRenameChat.value.title = renameInput.value;
    renameDialogVisible.value = false;
    ElMessage.success("重命名成功");
  } catch (error) {
    console.error("重命名失败:", error);
    ElMessage.error("重命名失败");
  }
};

// 删除对话
const deleteChat = async (chatId) => {
  try {
    await ElMessageBox.confirm("确定要删除这个对话吗？", "提示", {
      type: "warning",
    });

    const response = await fetch(
      `http://127.0.0.1:8082/ai/pdf/chat/${chatId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      throw new Error("删除失败");
    }

    chatList.value = chatList.value.filter((chat) => chat.id !== chatId);
    if (currentChatId.value === chatId) {
      currentChatId.value = "";
      router.push("/ai/pdf");
    }
    ElMessage.success("删除成功");
  } catch (error) {
    console.error("删除对话失败:", error);
    ElMessage.error("删除失败");
  }
};

// 文件上传相关
const beforeUpload = (file) => {
  const isPDF = file.type === "application/pdf";
  const isLt10M = file.size / 1024 / 1024 < 10;

  if (!isPDF) {
    ElMessage.error("只能上传PDF文件！");
    return false;
  }
  if (!isLt10M) {
    ElMessage.error("文件大小不能超过10MB！");
    return false;
  }
  return true;
};

const handleUploadProgress = (event, file) => {
  console.log("上传进度:", event.percent);
};

const handleUploadSuccess = (response) => {
  console.log("文件上传成功，响应:", response);
  ElMessage.success("上传成功");
  // 如果响应中包含文件信息，直接更新列表
  if (response && response.file) {
    fileList.value.push(response.file);
  } else {
    // 否则重新加载文件列表
    loadFileList();
  }
};

const handleUploadError = () => {
  ElMessage.error("上传失败");
};

// 加载文件列表
const loadFileList = async () => {
  try {
    console.log("开始加载文件列表，chatId:", currentChatId.value);
    const response = await fetch(
      `http://127.0.0.1:8082/ai/pdf/files/${currentChatId.value}`
    );
    if (!response.ok) {
      // 如果是404错误（没有文件），不显示错误消息
      if (response.status === 404) {
        fileList.value = [];
        return;
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    console.log("获取到的文件列表数据:", data);
    if (data && Array.isArray(data.files)) {
      fileList.value = data.files;
    } else {
      console.warn("文件列表数据格式不正确:", data);
      // 如果数据格式不正确，尝试使用其他可能的格式
      if (data && Array.isArray(data)) {
        fileList.value = data;
      } else if (data && typeof data === "object") {
        fileList.value = Object.values(data);
      } else {
        // 如果数据格式完全不对，设置为空数组而不是显示错误
        fileList.value = [];
      }
    }
  } catch (error) {
    console.error("加载文件列表失败:", error);
    // 只有在非404错误且当前列表为空时才显示错误消息
    if (
      error.message &&
      !error.message.includes("404") &&
      fileList.value.length === 0
    ) {
      ElMessage.error("加载文件列表失败");
    } else {
      // 其他情况设置为空数组
      fileList.value = [];
    }
  }
};

// 删除文件
const deleteFile = async (fileId) => {
  try {
    await ElMessageBox.confirm("确定要删除这个文件吗？", "提示", {
      type: "warning",
    });

    const response = await fetch(
      `http://127.0.0.1:8082/ai/pdf/file/${fileId}`,
      {
        method: "DELETE",
      }
    );

    if (response.ok) {
      fileList.value = fileList.value.filter((file) => file.id !== fileId);
      ElMessage.success("删除成功");
    } else {
      throw new Error("删除失败");
    }
  } catch (error) {
    ElMessage.error("删除文件失败");
  }
};

// 下载文件
const downloadFile = async (fileId, fileName) => {
  try {
    const response = await fetch(
      `http://127.0.0.1:8082/ai/pdf/file/${fileId}/download`
    );
    if (!response.ok) {
      throw new Error("下载失败");
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error("下载文件失败:", error);
    ElMessage.error("下载文件失败");
  }
};

// Markdown渲染
const renderMarkdown = (content) => {
  return marked(content);
};

// 滚动到底部
const scrollToBottom = () => {
  if (messageList.value) {
    messageList.value.scrollTop = messageList.value.scrollHeight;
  }
};

// 加载聊天列表
const loadChatList = () => {
  // 直接创建一个新对话
  createNewChat();
};

const goToHome = () => {
  router.push("/");
};
</script>

<style scoped>
.chat-app {
  display: flex;
  height: 100vh;
  background-color: #f7f7f7;
}

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

.file-section {
  padding: 16px;
  border-top: 1px solid #e8e8e8;
}

.file-list {
  margin-top: 15px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 10px;
  margin-bottom: 5px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.file-name {
  margin-left: 10px;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-actions {
  display: flex;
  gap: 8px;
}

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
}

.message-meta {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.message-user .message-meta {
  color: rgba(255, 255, 255, 0.8);
}

.input-container {
  padding: 20px;
  background: #fff;
  border-top: 1px solid #e8e8e8;
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
</style>
