<template>
  <div class="project-container">
    <el-header>
      <div class="header-content">
        <h1 class="header-title" @click="goToHome">小说客服</h1>
        <el-tag type="warning" effect="dark">小说客服</el-tag>
      </div>
    </el-header>
    <div class="content">
      <div class="chat-container">
        <div class="chat-messages" ref="messagesContainer">
          <div
            v-for="(message, index) in messages"
            :key="index"
            :class="[
              'message',
              message.type === 'user' ? 'user-message' : 'ai-message',
            ]"
          >
            <div class="message-avatar">
              <el-avatar
                :icon="message.type === 'user' ? 'User' : 'ChatDotRound'"
              />
            </div>
            <div class="message-content-wrapper">
              <div class="message-content">
                {{ message.content }}
              </div>
              <div class="message-time">
                {{ formatTime(message.timestamp) }}
              </div>
            </div>
          </div>
        </div>
        <div class="chat-input">
          <el-input
            v-model="userInput"
            type="textarea"
            :rows="4"
            placeholder="请输入您的问题，例如：推荐一本好看的小说..."
            @keyup.enter.ctrl="sendMessage"
            resize="none"
          />
          <div class="input-actions">
            <el-tooltip content="Ctrl + Enter 发送" placement="top">
              <el-button
                type="warning"
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
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from "vue";
import { useRouter } from "vue-router";
import axios from "axios";
import { ElMessage } from "element-plus";
import { User, ChatDotRound, Position } from "@element-plus/icons-vue";
import dayjs from "dayjs";

const router = useRouter();
const userInput = ref("");
const loading = ref(false);
const messagesContainer = ref(null);
const messages = ref([]);
const chatId = ref(Date.now().toString());

const formatTime = (timestamp) => {
  return dayjs(timestamp).format("HH:mm:ss");
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
  }
};

const sendMessage = async () => {
  if (!userInput.value.trim() || loading.value) return;

  const userMessage = {
    type: "user",
    content: userInput.value,
    timestamp: new Date(),
  };

  messages.value.push(userMessage);
  const prompt = userInput.value;
  userInput.value = "";
  loading.value = true;

  try {
    const response = await axios.get(`/ai/service`, {
      params: {
        prompt: prompt,
        chatId: chatId.value,
      },
    });

    const aiMessage = {
      type: "ai",
      content: response.data,
      timestamp: new Date(),
    };

    messages.value.push(aiMessage);
    await scrollToBottom();
  } catch (error) {
    console.error("发送消息失败:", error);
    ElMessage.error("发送消息失败，请重试");
  } finally {
    loading.value = false;
  }
};

const goToHome = () => {
  router.push("/");
};

onMounted(() => {
  messages.value.push({
    type: "ai",
    content:
      "您好！我是小说客服助手，很高兴为您服务。您可以询问我关于小说的任何问题，比如：\n1. 推荐一些好看的小说\n2. 某本小说的具体内容\n3. 小说作者的信息\n4. 小说分类推荐\n请问有什么可以帮您的吗？",
    timestamp: new Date(),
  });
});
</script>

<style scoped>
.project-container {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
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
}

.header-content h1 {
  margin: 0;
  font-size: 32px;
  font-weight: 600;
}

.content {
  padding: 20px;
  height: calc(100vh - 80px);
}

.chat-container {
  max-width: 1000px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 16px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.message {
  display: flex;
  margin-bottom: 20px;
  gap: 12px;
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
  padding: 12px 16px;
  border-radius: 12px;
  background-color: #f4f4f5;
  color: #333;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.user-message .message-content {
  background: linear-gradient(135deg, #e6a23c 0%, #f0c78a 100%);
  color: white;
}

.message-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  text-align: right;
}

.chat-input {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
}

.input-actions {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
}

.header-title {
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  padding: 5px 10px;
  border-radius: 4px;
}

.header-title:hover {
  background-color: rgba(255, 255, 255, 0.2);
}

.header-title:active {
  transform: scale(0.98);
}
</style>
