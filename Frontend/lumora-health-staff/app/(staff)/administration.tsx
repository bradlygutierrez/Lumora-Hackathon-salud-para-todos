import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PermissionGate } from '@/src/features/auth/components/PermissionGate';
import { createAdminUser, listUsers, resendPasswordReset } from '@/src/features/auth/api/users.api';
import { Button } from '@/src/shared/components/Button';
import { ErrorState, LoadingState } from '@/src/shared/components/RemoteState';
import { Screen } from '@/src/shared/components/Screen';
import { TextField } from '@/src/shared/components/TextField';
import { theme } from '@/src/shared/constants/theme';

export default function AdministrationScreen() {
  const queryClient = useQueryClient();
  const users = useQuery({ queryKey: ['administration', 'users'], queryFn: listUsers });
  const [form, setForm] = useState({ email: '', username: '', password: '', nombres: '', apellidos: '' });
  const create = useMutation({ mutationFn: () => createAdminUser({ email: form.email, username: form.username, password: form.password, persona: { nombres: form.nombres, apellidos: form.apellidos } }), onSuccess: () => { setForm({ email: '', username: '', password: '', nombres: '', apellidos: '' }); queryClient.invalidateQueries({ queryKey: ['administration', 'users'] }); Alert.alert('Cuenta creada', 'La cuenta fue creada.'); } });
  const resend = useMutation({ mutationFn: resendPasswordReset, onSuccess: () => Alert.alert('Correo enviado', 'Se reenvió el enlace de cambio de contraseña.') });
  if (users.isLoading) return <LoadingState title='Cargando administración' />;
  if (users.isError) return <ErrorState title='No se pudo cargar la administración' message='Intenta nuevamente.' />;
  return <PermissionGate allOf={['rbac:manage']} fallback={<ErrorState title='Acceso restringido' />}><Screen><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Administración</Text><Text style={styles.subtitle}>Cuentas de administrador y recuperación de acceso.</Text>
    <View style={styles.card}><Text style={styles.heading}>Crear cuenta de administrador</Text>
      {(['nombres', 'apellidos', 'email', 'username', 'password'] as const).map((field) => <TextField key={field} label={field === 'nombres' ? 'Nombres' : field === 'apellidos' ? 'Apellidos' : field === 'email' ? 'Correo' : field === 'username' ? 'Usuario' : 'Contraseña temporal'} secureTextEntry={field === 'password'} value={form[field]} onChangeText={(value) => setForm((current) => ({ ...current, [field]: value }))} />)}
      <Button loading={create.isPending} onPress={() => create.mutate()}>Crear administrador</Button>
    </View>
    <View style={styles.card}><Text style={styles.heading}>Usuarios creados</Text>{(users.data?.items ?? []).map((user) => <View key={user.id} style={styles.row}><View style={styles.copy}><Text style={styles.name}>{user.persona.nombres} {user.persona.apellidos}</Text><Text style={styles.email}>{user.email}</Text></View><Button variant='secondary' loading={resend.isPending && resend.variables === user.id} onPress={() => resend.mutate(user.id)}>Reenviar</Button></View>)}</View>
  </ScrollView></Screen></PermissionGate>;
}
const styles = StyleSheet.create({ content: { gap: theme.spacing.lg, paddingBottom: theme.spacing.xxl }, title: { color: theme.color.text, fontSize: 30, fontWeight: '900' }, subtitle: { color: theme.color.mutedText }, card: { backgroundColor: theme.color.surface, borderColor: theme.color.softBorder, borderRadius: theme.radius.lg, borderWidth: 1, gap: theme.spacing.md, padding: theme.spacing.lg }, heading: { color: theme.color.text, fontSize: 19, fontWeight: '900' }, row: { alignItems: 'center', borderBottomColor: theme.color.softBorder, borderBottomWidth: 1, flexDirection: 'row', gap: theme.spacing.md, paddingVertical: theme.spacing.sm }, copy: { flex: 1, gap: 3 }, name: { color: theme.color.text, fontWeight: '800' }, email: { color: theme.color.mutedText, fontSize: 12 } });
