// kafka/handlers/wallet.handler.js
import { EVENT_TYPES } from '../constants.js';
import { notify, rupees } from '../notify.js';

const FROM = 'wallet@dineshfarms.app';
const data = { screen: 'Wallet' };

const handleTopupSuccess = async ({ userId, amount, balanceAfter }) => {
  await notify(userId, {
    type: 'WALLET_TOPUP',
    title: 'Wallet top-up successful',
    body: `${rupees(amount)} added. New balance: ${rupees(balanceAfter)}.`,
    data,
    email: {
      from: FROM,
      subject: `Wallet Top-up Successful — ${rupees(amount)}`,
      html: `<p>${rupees(amount)} was added to your wallet. New balance: ${rupees(balanceAfter)}.</p>`,
    },
  });
};

const handleTopupFailed = async ({ userId, amount, reason }) => {
  await notify(userId, {
    type: 'WALLET_TOPUP_FAILED',
    title: 'Wallet top-up failed',
    body: `Your top-up of ${rupees(amount)} didn't go through.${reason ? ` ${reason}` : ''}`,
    data,
    email: {
      from: FROM,
      subject: `Wallet Top-up Failed — ${rupees(amount)}`,
      html: `<p>Your top-up of ${rupees(amount)} failed.${reason ? ` Reason: ${reason}.` : ''} If money was deducted, it will be refunded by your bank.</p>`,
    },
  });
};

const handleWithdrawSuccess = async ({ userId, amount, balanceAfter }) => {
  await notify(userId, {
    type: 'WALLET_WITHDRAW',
    title: 'Withdrawal successful',
    body: `${rupees(amount)} withdrawn. Balance: ${rupees(balanceAfter)}.`,
    data,
    email: {
      from: FROM,
      subject: `Withdrawal Successful — ${rupees(amount)}`,
      html: `<p>${rupees(amount)} was withdrawn from your wallet. Balance: ${rupees(balanceAfter)}.</p>`,
    },
  });
};

const handleDebited = async ({ userId, amount, balanceAfter, orderId }) => {
  await notify(userId, {
    type: 'WALLET_DEBITED',
    title: 'Wallet debited',
    body: `${rupees(amount)} paid${orderId ? ` for order ${orderId}` : ''}. Balance: ${rupees(balanceAfter)}.`,
    data,
    referenceId: orderId,
  });
};

const handleRefunded = async ({ userId, amount, balanceAfter, orderId }) => {
  await notify(userId, {
    type: 'WALLET_REFUNDED',
    title: 'Refund credited',
    body: `${rupees(amount)} refunded to your wallet${orderId ? ` for order ${orderId}` : ''}.`,
    data,
    referenceId: orderId,
    email: {
      from: FROM,
      subject: `Refund Credited — ${rupees(amount)}`,
      html: `<p>${rupees(amount)} was refunded to your wallet${orderId ? ` for order ${orderId}` : ''}. New balance: ${rupees(balanceAfter)}.</p>`,
    },
  });
};

const handleBalanceLow = async ({ userId, balance }) => {
  await notify(userId, {
    type: 'WALLET_BALANCE_LOW',
    title: 'Low wallet balance',
    body: `Your balance is ${rupees(balance)}. Top up to avoid missed deliveries.`,
    data,
  });
};

export const walletHandlers = {
  [EVENT_TYPES.WALLET_TOPUP_SUCCESS]: handleTopupSuccess,
  [EVENT_TYPES.WALLET_TOPUP_FAILED]: handleTopupFailed,
  [EVENT_TYPES.WALLET_WITHDRAW_SUCCESS]: handleWithdrawSuccess,
  [EVENT_TYPES.WALLET_DEBITED]: handleDebited,
  [EVENT_TYPES.WALLET_REFUNDED]: handleRefunded,
  [EVENT_TYPES.WALLET_BALANCE_LOW]: handleBalanceLow,
};

export default walletHandlers;
