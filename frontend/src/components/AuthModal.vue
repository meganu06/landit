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
  background: rgba(30, 45, 36, 0.45);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.auth-modal {
  background: #ffffff;
  border-radius: 16px;
  padding: 2rem;
  width: 90%;
  max-width: 400px;
  box-shadow: 0 20px 40px rgba(52, 78, 65, 0.16);
}

.auth-modal h2 {
  font-family: 'Atteron', 'DM Sans', sans-serif;
  color: #344e41;
  margin-bottom: 1.5rem;
  font-size: 1.4rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  font-size: 0.85rem;
  color: #4a5e52;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #c8c4bb;
  border-radius: 8px;
  font-size: 0.95rem;
  font-family: 'DM Sans', sans-serif;
  background: #ffffff;
  color: #1e2d24;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.form-group input:focus {
  border-color: #344e41;
  box-shadow: 0 0 0 3px rgba(52, 78, 65, 0.12);
}

.btn-primary {
  background: #344e41;
  color: #dad7cd;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  font-family: 'DM Sans', sans-serif;
  cursor: pointer;
  width: 100%;
  margin-top: 1rem;
  transition: background 0.15s;
}

.btn-primary:hover {
  background: #3a5a40;
}

.message {
  padding: 0.8rem 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  font-size: 0.875rem;
}

.message.success {
  background: #d6e8d6;
  color: #2d5a2d;
}

.message.error {
  background: #f5dede;
  color: #8b2222;
}

p {
  margin-top: 1rem;
  font-size: 0.85rem;
  color: #7a8c80;
  text-align: center;
}

a {
  color: #344e41;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

a:hover {
  color: #3a5a40;
}
</style>
