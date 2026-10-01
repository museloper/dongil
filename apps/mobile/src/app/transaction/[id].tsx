import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { TransactionForm } from '@/components/transaction-form';
import { ErrorState, Loading } from '@/components/ui';
import { useTransaction } from '@/features/queries';

export default function EditTransactionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tx = useTransaction(id);

  if (tx.data) return <TransactionForm key={tx.data.id} initial={tx.data} />;
  return (
    <View style={{ flex: 1, justifyContent: 'center' }}>
      {tx.error ? <ErrorState error={tx.error} onRetry={() => tx.refetch()} /> : <Loading />}
    </View>
  );
}
