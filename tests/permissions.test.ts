import {describe,it,expect} from 'vitest';
import {hasRole} from '../src/lib/roles';
describe('role hierarchy',()=>{
 it('allows super admin to perform librarian tasks',()=>expect(hasRole('SUPER_ADMIN',['LIBRARIAN'])).toBe(true));
 it('allows admin to perform librarian tasks',()=>expect(hasRole('ADMIN',['LIBRARIAN'])).toBe(true));
 it('does not allow librarian to perform admin tasks',()=>expect(hasRole('LIBRARIAN',['ADMIN'])).toBe(false));
 it('does not allow student to perform librarian tasks',()=>expect(hasRole('STUDENT',['LIBRARIAN'])).toBe(false));
});
