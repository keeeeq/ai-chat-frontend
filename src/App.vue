<template>
  <div class="app-container">
    <el-container>
      <el-header>
        <div class="header-content">
          <h1>AI 聊天助手</h1>
          <el-tag type="info" effect="dark">智能对话</el-tag>
        </div>
      </el-header>
      <el-container>
        <el-aside width="300px" class="chat-sidebar">
          <div class="sidebar-header">
            <el-button type="primary" @click="createNewChat" size="small">
              <el-icon><Plus /></el-icon>
              新建对话
            </el-button>
          </div>
          <div class="chat-list">
            <div
              v-for="chat in chatList"
              :key="chat.id"
              :class="['chat-item', { active: currentChatId === chat.id }]"
              @click="switchChat(chat.id)"
            >
              <el-icon><ChatDotRound /></el-icon>
              <div class="chat-item-content">
                <span class="chat-title">{{ chat.title || "新对话" }}</span>
                <div class="chat-actions">
                  <el-tooltip content="重命名" placement="top">
                    <el-button
                      type="text"
                      @click.stop="showRenameDialog(chat)"
                      size="small"
                    >
                      <el-icon><Edit /></el-icon>
                    </el-button>
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top">
                    <el-button
                      type="text"
                      @click.stop="deleteChat(chat.id)"
                      size="small"
                    >
                      <el-icon><Delete /></el-icon>
                    </el-button>
                  </el-tooltip>
                </div>
              </div>
            </div>
          </div>
        </el-aside>
        <el-main>
          <div class="chat-container">
            <div class="chat-messages" ref="messagesContainer">
              <div
                v-for="(message, index) in currentChatHistory"
                :key="index"
                :class="[
                  'message',
                  message.type === 'user' ? 'user-message' : 'ai-message',
                ]"
              >
                <div class="message-avatar">
                  <el-avatar :size="50">
                    <el-icon v-if="message.type === 'user'"><User /></el-icon>
                    <el-icon v-else><ChatDotRound /></el-icon>
                  </el-avatar>
                </div>
                <div class="message-content-wrapper">
                  <div class="message-content">
                    <div class="message-text">{{ message.content }}</div>
                    <div class="message-time">
                      {{ formatTime(message.timestamp) }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="loading" class="loading-message">
                <el-avatar :size="50">
                  <el-icon><ChatDotRound /></el-icon>
                </el-avatar>
                <div class="loading-content">
                  <div class="loading-text">AI 正在思考...</div>
                  <el-skeleton :rows="1" animated />
                </div>
              </div>
            </div>
            <div class="chat-input">
              <el-input
                v-model="userInput"
                type="textarea"
                :rows="4"
                placeholder="请输入您的问题..."
                @keyup.enter.ctrl="sendMessage"
                resize="none"
              />
              <div class="input-actions">
                <el-tooltip content="Ctrl + Enter 发送" placement="top">
                  <el-button
                    type="primary"
                    @click="sendMessage"
                    :loading="loading"
                    :disabled="!userInput.trim()"
                  >
                    <el-icon><Position /></el-icon>
                    发送
                  </el-button>
                </el-tooltip>
              </div>
            </div>
          </div>
        </el-main>
      </el-container>
    </el-container>

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
import { ref, onMounted, nextTick, computed } from "vue";
import axios from "axios";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  User,
  ChatDotRound,
  Position,
  Plus,
  Edit,
  Delete,
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

const switchChat = (chatId) => {
  currentChatId.value = chatId;
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

const sendMessage = async () => {
  if (!userInput.value.trim()) {
    ElMessage.warning("请输入内容");
    return;
  }

  if (!currentChatId.value) {
    createNewChat();
  }

  const userMessage = userInput.value.trim();
  const timestamp = new Date();

  allChatHistory.value[currentChatId.value].push({
    type: "user",
    content: userMessage,
    timestamp,
  });

  loading.value = true;
  try {
    const response = await axios.get(`/api/ai/chat`, {
      params: {
        prompt: userMessage,
        chatId: currentChatId.value,
      },
      headers: {
        "Content-Type": "text/plain",
        Accept: "*/*",
      },
      withCredentials: false,
      responseType: "text",
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
    scrollToBottom();
  }
};

onMounted(() => {
  createNewChat();
  scrollToBottom();
});
</script>

<style scoped>
.app-container {
  height: 100vh;
  background-color: #f5f7fa;
  max-width: 2560px;
  margin: 0 auto;
}

.el-header {
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  color: white;
  padding: 0 40px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  height: 80px;
}

.header-content {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 2400px;
  margin: 0 auto;
}

.header-content h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
}

.chat-sidebar {
  background-color: white;
  border-right: 1px solid #e4e7ed;
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 15px;
  margin-bottom: 10px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.chat-item:hover {
  background-color: #f5f7fa;
}

.chat-item.active {
  background-color: #ecf5ff;
  color: #409eff;
}

.chat-item-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-left: 12px;
}

.chat-title {
  font-size: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-actions {
  display: flex;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.chat-item:hover .chat-actions {
  opacity: 1;
}

.chat-container {
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  padding: 30px;
  max-width: 2200px;
  margin: 0 auto;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 30px;
  background-color: white;
  border-radius: 16px;
  margin-bottom: 30px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.message {
  display: flex;
  margin-bottom: 30px;
  gap: 20px;
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content-wrapper {
  max-width: 80%;
}

.message-content {
  position: relative;
  padding: 20px;
  border-radius: 16px;
  word-break: break-word;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  font-size: 16px;
  line-height: 1.6;
}

.user-message .message-content {
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  color: white;
  border-top-right-radius: 0;
}

.ai-message .message-content {
  background-color: #f4f4f5;
  color: #333;
  border-top-left-radius: 0;
}

.message-time {
  font-size: 14px;
  color: #909399;
  margin-top: 8px;
  text-align: right;
}

.loading-message {
  display: flex;
  gap: 20px;
  margin-bottom: 30px;
}

.loading-content {
  flex: 1;
}

.loading-text {
  margin-bottom: 12px;
  color: #909399;
  font-size: 16px;
}

.chat-input {
  background-color: white;
  padding: 30px;
  border-radius: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.input-actions {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

:deep(.el-textarea__inner) {
  font-size: 16px;
  line-height: 1.6;
  padding: 16px;
}

:deep(.el-button) {
  padding: 12px 24px;
  font-size: 16px;
}

@media (max-width: 2560px) {
  .chat-container {
    padding: 20px;
  }

  .chat-messages {
    padding: 20px;
  }

  .message-content-wrapper {
    max-width: 70%;
  }
}

@media (max-width: 1920px) {
  .chat-container {
    padding: 15px;
  }

  .chat-messages {
    padding: 15px;
  }

  .message-content-wrapper {
    max-width: 65%;
  }
}
</style>
