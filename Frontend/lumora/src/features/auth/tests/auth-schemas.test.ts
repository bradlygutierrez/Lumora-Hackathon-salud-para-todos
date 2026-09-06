import { loginSchema, registerAccountSchema, verifyEmailSchema } from '@/features/auth/schemas/auth.schemas';
describe('B08 auth schemas',()=>{
 it('accepts a valid login',()=>expect(loginSchema.safeParse({login:'user',password:'x'}).success).toBe(true));
 it('requires the backend password policy',()=>expect(registerAccountSchema.safeParse({username:'user',email:'u@e.com',phone:'88888888',password:'weakpass',confirmPassword:'weakpass'}).success).toBe(false));
 it('accepts six digit email codes only',()=>{expect(verifyEmailSchema.safeParse({code:'123456'}).success).toBe(true);expect(verifyEmailSchema.safeParse({code:'12345'}).success).toBe(false)});
});
