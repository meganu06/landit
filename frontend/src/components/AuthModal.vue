<template>
  <div v-if="showModal" class="auth-overlay" @click="closeModal">
    <div class="auth-modal" @click.stop>
      <div v-if="mode === 'signin'">
        <h2>Sign In</h2>
        <form @submit.prevent="signIn">
          <div class="form-group">
            <label>Email</label>
            <input v-model="email" type="email" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="password" type="password" required>
          </div>
          <button type="submit" class="btn-primary">Sign In</button>
        </form>
        <p>Don't have an account? <a @click="mode = 'signup'">Sign Up</a></p>
      </div>
      
      <div v-else>
        <h2>Sign Up</h2>
        <form @submit.prevent="signUp">
          <div class="form-group">
            <label>First Name</label>
            <input v-model="firstName" type="text" required>
          </div>
          <div class="form-group">
            <label>Last Name</label>
            <input v-model="lastName" type="text" required>
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="email" type="email" required>
          </div>
          <div class="form-group">
            <label>Password</label>
            <input v-model="password" type="password" required>
          </div>
          <button type="submit" class="btn-primary">Sign Up</button>
        </form>
        <p>Already have an account? <a @click="mode = 'signin'">Sign In</a></p>
      </div>
      
      <div v-if="message" class="message" :class="messageType">{{ message }}</div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AuthModal',
  props: {
    show: Boolean,
    initialMode: {
      type: String,
      default: 'signin'
    }
  },
  data() {
    return {
      mode: this.initialMode,
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      message: '',
      messageType: ''
    }
  },
  computed: {
    showModal() {
      return this.show
    }
  },
  methods: {
    async signIn() {
      try {
        const result = await window.landItAuth.signIn(this.email, this.password)
        if (result.success) {
          this.showMessage('Signed in successfully!', 'success')
          this.$emit('close')
        } else {
          this.showMessage(result.error, 'error')
        }
      } catch (error) {
        this.showMessage('Sign in failed', 'error')
      }
    },
    
    async signUp() {
      try {
        const userData = {
          firstName: this.firstName,
          lastName: this.lastName,
          role: 'student'
        }
        const result = await window.landItAuth.signUp(this.email, this.password, userData)
        if (result.success) {
          this.showMessage('Account created successfully!', 'success')
          setTimeout(() => this.$emit('close'), 2000)
        } else {
          this.showMessage(result.error, 'error')
        }
      } catch (error) {
        this.showMessage('Sign up failed', 'error')
      }
    },
    
    closeModal() {
      this.$emit('close')
    },
    
    showMessage(text, type) {
      this.message = text
      this.messageType = type
      setTimeout(() => {
        this.message = ''
      }, 5000)
    }
  }
}
</script>

<style scoped>
.auth-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.auth-modal {
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 1rem;
}

.btn-primary {
  background: #2563eb;
  color: white;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  width: 100%;
  margin-top: 1rem;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.message {
  padding: 1rem;
  border-radius: 6px;
  margin-top: 1rem;
}

.message.success {
  background: #d1fae5;
  color: #065f46;
}

.message.error {
  background: #fee2e2;
  color: #991b1b;
}

a {
  color: #2563eb;
  cursor: pointer;
  text-decoration: underline;
}
</style>
