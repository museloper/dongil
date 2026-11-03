import { useParams } from 'react-router';
import { ModalHeader } from '@/components/screen';
import { TransactionForm } from '@/components/transaction-form';
import { ErrorState, Loading } from '@/components/ui';
import { useTransaction } from '@/features/queries';

export function NewTransactionPage() {
  return <TransactionForm />;
}

export function EditTransactionPage() {
  const { id } = useParams<{ id: string }>();
  const tx = useTransaction(id);

  if (tx.data) return <TransactionForm key={tx.data.id} initial={tx.data} />;
  return (
    <main className="modal">
      <ModalHeader title="기록 수정" />
      {tx.error ? <ErrorState error={tx.error} onRetry={() => tx.refetch()} /> : <Loading />}
    </main>
  );
}
